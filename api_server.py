#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask API сервер для калькулятора LED экранов
Предоставляет API для:
- Получения курса доллара с сайта ЦБ РФ
- Расчет логистики
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import json
import logging
from datetime import datetime, timedelta

app = Flask(__name__)
# Разрешаем CORS для всех доменов и методов
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"]
    }
})

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# URL API ЦБ РФ для получения курса доллара
CBR_API_URL = "https://www.cbr.ru/scripts/XML_daily.asp"
EXCHANGE_RATE_MARGIN = 0.03  # +3% наценка


@app.route("/", methods=["GET"])
def index():
    """Информация об API"""
    return jsonify({
        "name": "LED Calculator API",
        "version": "1.0.0",
        "endpoints": {
            "/api/exchange-rate": "GET - Получить курс доллара с наценкой +3%",
            "/api/logistics": "POST - Рассчитать стоимость логистики"
        }
    })


@app.route("/api/exchange-rate", methods=["GET", "OPTIONS"])
def get_exchange_rate():
    """Получить курс доллара с сайта ЦБ РФ с наценкой +3%"""
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        logger.info(f"Запрос курса доллара от {request.remote_addr}")
        # Запрос к API ЦБ РФ
        req = urllib.request.Request(
            CBR_API_URL,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read().decode("utf-8")
        
        # Парсинг XML
        root = ET.fromstring(xml_data)
        
        # Поиск USD (код 840)
        usd_rate = None
        for valute in root.findall("Valute"):
            char_code = valute.find("CharCode")
            if char_code is not None and char_code.text == "USD":
                value_elem = valute.find("Value")
                nominal_elem = valute.find("Nominal")
                
                if value_elem is not None and nominal_elem is not None:
                    value_str = value_elem.text.replace(",", ".")
                    nominal_str = nominal_elem.text.replace(",", ".")
                    
                    try:
                        value = float(value_str)
                        nominal = float(nominal_str)
                        usd_rate = value / nominal if nominal > 0 else value
                    except (ValueError, ZeroDivisionError):
                        logger.error(f"Ошибка парсинга курса: value={value_str}, nominal={nominal_str}")
                        continue
        
        if usd_rate is None:
            logger.error("USD курс не найден в ответе ЦБ РФ")
            return jsonify({"error": "Курс USD не найден"}), 500
        
        # Применяем наценку +3%
        rate_with_margin = usd_rate * (1 + EXCHANGE_RATE_MARGIN)
        
        logger.info(f"Курс USD получен: {usd_rate}, с наценкой: {rate_with_margin:.2f}")
        
        return jsonify({
            "success": True,
            "rate": round(rate_with_margin, 2),
            "baseRate": round(usd_rate, 2),
            "margin": EXCHANGE_RATE_MARGIN,
            "source": "cbr.ru",
            "timestamp": datetime.now().isoformat()
        })
        
    except urllib.error.URLError as e:
        logger.error(f"Ошибка запроса к ЦБ РФ: {e}")
        return jsonify({"error": f"Ошибка подключения к ЦБ РФ: {str(e)}"}), 500
    except ET.ParseError as e:
        logger.error(f"Ошибка парсинга XML: {e}")
        return jsonify({"error": "Ошибка парсинга данных ЦБ РФ"}), 500
    except Exception as e:
        logger.error(f"Неожиданная ошибка: {e}", exc_info=True)
        return jsonify({"error": f"Внутренняя ошибка сервера: {str(e)}"}), 500


@app.route("/api/logistics", methods=["POST", "OPTIONS"])
def calculate_logistics():
    """Рассчитать стоимость доставки"""
    if request.method == "OPTIONS":
        return "", 200
    
    try:
        logger.info(f"Запрос расчета логистики от {request.remote_addr}")
        data = request.get_json()
        if not data:
            return jsonify({"error": "Нет данных"}), 400
        
        delivery_city = data.get("deliveryCity", "").strip()
        weight_kg = float(data.get("weightKg", 0))
        declared_value = float(data.get("declaredValue", 0))
        
        logger.info(f"Запрос расчета логистики: город='{delivery_city}', вес={weight_kg} кг, стоимость={declared_value} руб.")
        
        if not delivery_city:
            logger.warning("Ошибка: не указан город доставки")
            return jsonify({"error": "Не указан город доставки"}), 400
        
        if weight_kg <= 0:
            logger.warning(f"Ошибка: неверный вес груза: {weight_kg}")
            return jsonify({"error": "Не указан вес груза"}), 400
        
        # Приблизительный расчет (временное решение)
        # Базовая цена зависит от расстояния (упрощенная модель)
        base_price_per_kg = 75  # Приблизительный тариф руб/кг
        min_price = 1500  # Минимальная стоимость доставки
        
        # Увеличиваем тариф для дальних городов
        far_cities = ["Владивосток", "Хабаровск", "Южно-Сахалинск", "Петропавловск-Камчатский"]
        if any(city.lower() in delivery_city.lower() for city in far_cities):
            base_price_per_kg = 120
        
        estimated_price = max(min_price, weight_kg * base_price_per_kg)
        
        # Добавляем страховку, если указана стоимость
        if declared_value > 0:
            insurance = declared_value * 0.007  # 0.7% страховка
            estimated_price += insurance
        
        # Округляем до сотен
        estimated_price = round(estimated_price / 100) * 100
        
        result = {
            "success": True,
            "price": round(estimated_price, 2),
            "currency": "RUB",
            "from": "Екатеринбург",
            "to": delivery_city,
            "weight": weight_kg,
            "volume": 2.0,  # 2 кубометра
            "note": "Приблизительный расчет. Для точного расчета требуется интеграция с Dellin API (нужен appkey)"
        }
        
        logger.info(f"Логистика рассчитана: {delivery_city} - {result['price']} руб.")
        
        return jsonify(result)
        
    except ValueError as e:
        logger.error(f"Ошибка преобразования данных: {e}")
        return jsonify({"error": f"Ошибка преобразования данных: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Ошибка расчета логистики: {e}", exc_info=True)
        return jsonify({"error": f"Ошибка расчета логистики: {str(e)}"}), 500


if __name__ == "__main__":
    # Для продакшена используйте WSGI сервер (gunicorn, uwsgi и т.д.)
    # Для разработки можно запустить так:
    import os
    
    # Определяем порт из переменной окружения или используем 5000
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    logger.info("=" * 50)
    logger.info("Запуск Flask API сервера...")
    logger.info(f"API будет доступен по адресу: http://{host}:{port}")
    logger.info(f"Эндпоинты:")
    logger.info(f"  GET  http://{host}:{port}/api/exchange-rate")
    logger.info(f"  POST http://{host}:{port}/api/logistics")
    logger.info("=" * 50)
    
    try:
        app.run(host=host, port=port, debug=False, threaded=True)
    except OSError as e:
        if "Address already in use" in str(e) or "уже используется" in str(e):
            logger.error(f"Порт {port} уже занят! Остановите другой процесс или измените PORT")
            logger.error(f"Пример: export PORT=5001")
        else:
            logger.error(f"Ошибка запуска сервера: {e}")
        raise

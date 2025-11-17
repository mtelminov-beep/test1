#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API сервер для сохранения данных пользователей в файлы
Сохраняет данные в папку SAVE/{username}/
"""

import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, timedelta
import re
import urllib.request
import xml.etree.ElementTree as ET
import urllib.parse

app = Flask(__name__)
CORS(app)  # Разрешить CORS для работы с браузером

# Базовая директория для сохранения данных
SAVE_DIR = os.path.join(os.path.dirname(__file__), "SAVE")

# Создать папку SAVE если не существует
os.makedirs(SAVE_DIR, exist_ok=True)


def sanitize_filename(name):
    """Очистить имя файла от недопустимых символов"""
    # Заменить недопустимые символы на подчеркивание
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    # Убрать пробелы в начале и конце
    name = name.strip()
    # Ограничить длину
    if len(name) > 100:
        name = name[:100]
    return name if name else "user"


@app.route("/api/save", methods=["POST", "GET"])
def save_user_data():
    """Сохранить или загрузить данные пользователя"""
    
    if request.method == "POST":
        # Сохранение данных
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "Нет данных"}), 400
            
            user_id = data.get("userId")
            user_email = data.get("userEmail", "")
            user_name = data.get("userName", "")
            
            if not user_id:
                return jsonify({"error": "Не указан userId"}), 400
            
            # Создать безопасное имя папки пользователя
            folder_name = sanitize_filename(user_email or user_name or user_id)
            user_dir = os.path.join(SAVE_DIR, folder_name)
            os.makedirs(user_dir, exist_ok=True)
            
            # Сохранить основные данные пользователя
            data_file = os.path.join(user_dir, "data.json")
            with open(data_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # Сохранить также с меткой времени для истории
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(user_dir, f"backup_{timestamp}.json")
            with open(backup_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # Хранить только последние 10 резервных копий
            backups = sorted(
                [f for f in os.listdir(user_dir) if f.startswith("backup_")],
                reverse=True
            )
            for old_backup in backups[10:]:
                try:
                    os.remove(os.path.join(user_dir, old_backup))
                except:
                    pass
            
            return jsonify({
                "success": True,
                "message": "Данные сохранены",
                "path": folder_name
            })
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    elif request.method == "GET":
        # Загрузка данных
        try:
            user_id = request.args.get("userId")
            if not user_id:
                return jsonify({"error": "Не указан userId"}), 400
            
            # Найти папку пользователя
            # Ищем по всем папкам, проверяя data.json
            for folder_name in os.listdir(SAVE_DIR):
                folder_path = os.path.join(SAVE_DIR, folder_name)
                if not os.path.isdir(folder_path):
                    continue
                
                data_file = os.path.join(folder_path, "data.json")
                if not os.path.exists(data_file):
                    continue
                
                try:
                    with open(data_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    
                    if data.get("userId") == user_id:
                        return jsonify(data)
                except:
                    continue
            
            return jsonify({"error": "Данные не найдены"}), 404
            
        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route("/api/users", methods=["GET"])
def list_users():
    """Получить список всех пользователей с сохраненными данными"""
    try:
        users = []
        for folder_name in os.listdir(SAVE_DIR):
            folder_path = os.path.join(SAVE_DIR, folder_name)
            if not os.path.isdir(folder_path):
                continue
            
            data_file = os.path.join(folder_path, "data.json")
            if not os.path.exists(data_file):
                continue
            
            try:
                with open(data_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                
                users.append({
                    "userId": data.get("userId"),
                    "userName": data.get("userName", ""),
                    "userEmail": data.get("userEmail", ""),
                    "folder": folder_name,
                    "lastSaved": os.path.getmtime(data_file)
                })
            except:
                continue
        
        return jsonify({"users": users})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/exchange-rate", methods=["GET"])
def get_exchange_rate():
    """Получить курс доллара с сайта Банка России + 3%"""
    try:
        # URL API Банка России для получения курсов валют
        # Согласно документации: https://cbr.ru/development/SXML/
        # Если параметр date_req отсутствует, получаем последнюю зарегистрированную дату
        url = "http://www.cbr.ru/scripts/XML_daily.asp"
        
        # Получить XML с курсами валют
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            # Проверить кодировку ответа
            content_type = response.headers.get_content_charset() or 'windows-1251'
            xml_data = response.read().decode(content_type)
        
        # Парсить XML
        root = ET.fromstring(xml_data)
        
        # Найти доллар США
        # Вариант 1: По ISO коду USD (CharCode)
        # Вариант 2: По уникальному коду R01235 (из документации)
        usd_rate = None
        date_str = root.get('Date', '')
        
        for valute in root.findall('Valute'):
            # Проверка по CharCode (USD)
            char_code_elem = valute.find('CharCode')
            char_code = char_code_elem.text if char_code_elem is not None and char_code_elem.text else ""
            
            # Также проверяем по ID (R01235 для доллара США)
            valute_id = valute.get('ID', '')
            
            # Найти USD по коду или ID
            if char_code == 'USD' or valute_id == 'R01235':
                value_elem = valute.find('Value')
                nominal_elem = valute.find('Nominal')
                
                if value_elem is None or nominal_elem is None:
                    continue
                
                # Получить текст значений
                value_text = value_elem.text.strip() if value_elem.text else ""
                nominal_text = nominal_elem.text.strip() if nominal_elem.text else "1"
                
                if not value_text:
                    continue
                
                # Заменить запятую на точку для правильного парсинга float
                value_str = value_text.replace(',', '.')
                try:
                    nominal = int(nominal_text)
                    if nominal <= 0:
                        nominal = 1
                except (ValueError, TypeError):
                    nominal = 1
                
                # Курс в XML указан за номинал единиц
                # Для USD обычно nominal=1, поэтому курс = value / 1 = value
                try:
                    usd_rate = float(value_str) / nominal
                    print(f"Найден курс USD: {usd_rate} (из value={value_text}, nominal={nominal_text})")
                    break
                except (ValueError, TypeError) as e:
                    print(f"Ошибка парсинга курса USD: {e}, value_text={value_text}, value_str={value_str}")
                    continue
        
        if usd_rate is None:
            # Если не нашли USD, выведем доступные валюты для отладки
            available_currencies = []
            for valute in root.findall('Valute'):
                char_code_elem = valute.find('CharCode')
                if char_code_elem is not None:
                    available_currencies.append(char_code_elem.text)
            print(f"USD не найден. Доступные валюты: {', '.join(available_currencies[:10])}")
            return jsonify({"error": "Курс USD не найден в данных Банка России"}), 404
        
        # Применить надбавку +3% к официальному курсу
        usd_rate_with_margin = usd_rate * 1.03
        
        return jsonify({
            "rate": round(usd_rate, 4),
            "rateWithMargin": round(usd_rate_with_margin, 4),
            "margin": 3.0,
            "date": date_str,
            "source": "cbr.ru"
        })
        
    except urllib.error.URLError as e:
        print(f"URLError: {e}")
        return jsonify({"error": f"Ошибка получения данных: {str(e)}"}), 500
    except ET.ParseError as e:
        print(f"ParseError: {e}")
        return jsonify({"error": f"Ошибка парсинга XML: {str(e)}"}), 500
    except ValueError as e:
        print(f"ValueError: {e}")
        return jsonify({"error": f"Ошибка преобразования данных: {str(e)}"}), 500
    except Exception as e:
        import traceback
        print(f"Неожиданная ошибка: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Неожиданная ошибка: {str(e)}"}), 500


@app.route("/api/logistics", methods=["POST"])
def calculate_logistics():
    """Рассчитать стоимость доставки через API Деловые Линии"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Нет данных"}), 400
        
        delivery_city = data.get("deliveryCity", "").strip()
        weight_kg = float(data.get("weightKg", 0))
        declared_value = float(data.get("declaredValue", 0))
        
        print(f"Запрос расчета логистики: город='{delivery_city}', вес={weight_kg} кг, стоимость={declared_value} руб.")
        
        if not delivery_city:
            print("Ошибка: не указан город доставки")
            return jsonify({"error": "Не указан город доставки"}), 400
        
        if weight_kg <= 0:
            print(f"Ошибка: неверный вес груза: {weight_kg}")
            return jsonify({"error": "Не указан вес груза"}), 400
        
        # Параметры для запроса к Dellin API
        # URL калькулятора: https://dev.dellin.ru/api/calculation/calculator/
        # Используем публичный API без авторизации для расчета
        
        # Для публичного API нужно использовать метод calculator/calculator
        # Но для полноценной работы нужен appkey - в данном случае используем публичный доступ
        
        # ВНИМАНИЕ: Для работы с Dellin API нужен appkey!
        # Здесь используется упрощенный подход через веб-форму калькулятора
        # В реальном проекте нужно получить appkey от Dellin
        
        # Параметры для расчета:
        # - Откуда: Екатеринбург
        # - Куда: указанный город
        # - Объем: 2 кубометра (фиксированный)
        # - Вес: расчетный вес экрана
        # - Объявленная стоимость: стоимость компонентов
        # - Характер груза: электроника
        # - Дата отправки: текущая дата
        # - Тип доставки: терминал-терминал
        
        # Пока используем приблизительный расчет на основе расстояния и веса
        # В реальном проекте нужно интегрировать с Dellin API
        
        # Приблизительный расчет (временное решение)
        # Для полноценной интеграции нужно:
        # 1. Получить appkey от Dellin
        # 2. Использовать официальный API: https://dev.dellin.ru/api/calculation/calculator/
        
        # Приблизительная стоимость доставки (упрощенный расчет)
        # Базовые тарифы могут варьироваться, поэтому используем приблизительный расчет
        
        # Базовый тариф от веса: ~50-100 руб/кг для терминал-терминал
        # Минимальная стоимость: ~1000-2000 руб
        # Зависит от расстояния между городами
        
        base_price_per_kg = 75  # Приблизительный тариф руб/кг
        min_price = 1500  # Минимальная стоимость доставки
        
        # Расчет стоимости на основе веса
        estimated_price = max(min_price, weight_kg * base_price_per_kg)
        
        # Добавляем надбавку за объявленную стоимость (страховка ~0.5-1%)
        if declared_value > 0:
            insurance = declared_value * 0.007  # 0.7% страховка
            estimated_price += insurance
        
        # Округляем до сотен рублей
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
        
        print(f"Логистика рассчитана: {delivery_city} - {result['price']} руб.")
        
        return jsonify(result)
        
    except ValueError as e:
        return jsonify({"error": f"Ошибка преобразования данных: {str(e)}"}), 400
    except Exception as e:
        import traceback
        print(f"Ошибка расчета логистики: {e}")
        print(traceback.format_exc())
        return jsonify({"error": f"Ошибка расчета логистики: {str(e)}"}), 500


@app.route("/", methods=["GET"])
def root():
    """Корневой маршрут с информацией об API"""
    return jsonify({
        "status": "ok",
        "message": "API сервер для калькулятора светодиодных экранов",
        "endpoints": {
            "/health": "Проверка работоспособности",
            "/api/exchange-rate": "Получить курс доллара (GET)",
            "/api/logistics": "Рассчитать стоимость доставки (POST)",
            "/api/save": "Сохранить/загрузить данные пользователя (POST/GET)",
            "/api/users": "Получить список пользователей (GET)"
        }
    })


@app.route("/health", methods=["GET"])
def health():
    """Проверка работоспособности API"""
    return jsonify({"status": "ok", "save_dir": SAVE_DIR})


if __name__ == "__main__":
    print(f"API сервер запущен")
    print(f"Папка сохранения: {SAVE_DIR}")
    print(f"API доступен по адресу: http://127.0.0.1:5000")
    print(f"Документация: http://127.0.0.1:5000/health")
    app.run(host="127.0.0.1", port=5000, debug=False)


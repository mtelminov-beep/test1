#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WSGI файл для запуска Flask приложения через Phusion Passenger
"""
import sys
import os
import logging

# Настройка логирования для отладки
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('/var/www/u3330187/data/www/calcmmvs.ru/test/passenger.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

try:
    # Добавляем путь к проекту в sys.path
    project_dir = os.path.dirname(os.path.abspath(__file__))
    logger.info(f"Project directory: {project_dir}")
    
    if project_dir not in sys.path:
        sys.path.insert(0, project_dir)
        logger.info(f"Added to sys.path: {project_dir}")
    
    # Проверяем наличие api_server.py
    api_server_path = os.path.join(project_dir, 'api_server.py')
    if not os.path.exists(api_server_path):
        logger.error(f"api_server.py not found at: {api_server_path}")
        raise FileNotFoundError(f"api_server.py not found at: {api_server_path}")
    
    logger.info(f"Importing app from api_server.py")
    
    # Импортируем приложение Flask
    from api_server import app as application
    
    logger.info("Successfully imported application from api_server")
    
except Exception as e:
    logger.error(f"Error importing application: {e}", exc_info=True)
    # Создаем простое приложение для отображения ошибки
    from flask import Flask
    application = Flask(__name__)
    
    @application.route('/')
    def error():
        return f"Error loading application: {str(e)}", 500

# Для отладки
if __name__ == "__main__":
    application.run()


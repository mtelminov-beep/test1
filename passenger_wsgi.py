#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
WSGI файл для запуска Flask приложения через Phusion Passenger
"""
import sys
import os

# Добавляем путь к проекту в sys.path
project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

# Импортируем приложение Flask
from api_server import app as application

# Для отладки
if __name__ == "__main__":
    application.run()


#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки импорта api_server
"""
import sys
import os

# Добавляем путь к проекту
project_dir = os.path.dirname(os.path.abspath(__file__))
if project_dir not in sys.path:
    sys.path.insert(0, project_dir)

print(f"Project directory: {project_dir}")
print(f"Python version: {sys.version}")
print(f"Python path: {sys.executable}")

# Проверяем наличие файлов
api_server_path = os.path.join(project_dir, 'api_server.py')
print(f"api_server.py exists: {os.path.exists(api_server_path)}")

# Пробуем импортировать Flask
try:
    import flask
    print(f"Flask version: {flask.__version__}")
except ImportError as e:
    print(f"Flask import error: {e}")
    sys.exit(1)

# Пробуем импортировать flask_cors
try:
    import flask_cors
    print(f"flask-cors imported successfully")
except ImportError as e:
    print(f"flask-cors import error: {e}")
    sys.exit(1)

# Пробуем импортировать api_server
try:
    from api_server import app
    print("api_server imported successfully")
    print(f"App type: {type(app)}")
    print("SUCCESS: All imports OK!")
except Exception as e:
    print(f"api_server import error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)


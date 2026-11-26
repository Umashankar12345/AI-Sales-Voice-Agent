@echo off
title VoxSales AI - Complete Prototype Launcher
echo =======================================================
echo Launching VoxSales AI Complete System
echo =======================================================

echo 1. Ensuring MongoDB is active...
start /B mongod.exe --dbpath "%~dp0backend\data\db" --bind_ip 127.0.0.1 --port 27017 > nul 2>&1
timeout /t 2 /nobreak > nul

echo 2. Launching FastAPI Backend on http://127.0.0.1:8000...
start cmd /k "title VoxSales AI Backend && set PYTHONPATH=backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak > nul

echo 3. Launching React Vite Frontend on http://localhost:5173...
start cmd /k "title VoxSales AI Frontend && cd frontend && npm run dev"

echo =======================================================
echo VoxSales AI is launching!
echo Frontend: http://localhost:5173
echo Backend API & Swagger: http://127.0.0.1:8000/docs
echo =======================================================
pause

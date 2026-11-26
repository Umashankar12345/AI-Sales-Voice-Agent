@echo off
title VoxSales AI - Backend Service
echo =======================================================
echo Starting VoxSales AI FastAPI Backend Server
echo =======================================================
set PYTHONPATH=backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause

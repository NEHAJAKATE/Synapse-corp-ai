@echo off
echo Starting Backend Server...
start cmd /k "cd backend && pip install -r requirements.txt && python main.py"

echo Starting Frontend Server...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ==============================================================
echo Synapse Corp AI is starting in two new command prompt windows!
echo Please wait about 15 seconds, then open:
echo http://localhost:3000
echo ==============================================================
pause

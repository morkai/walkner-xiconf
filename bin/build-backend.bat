@echo off

set NODE_ENV=production
set ROOT=%~dp0..

rm -rf %ROOT%\backend-build
mkdir %ROOT%\backend-build

call node12 %ROOT%/backend/main.js ../config/%1/xiconf-frontend.js --cache-require %ROOT%/backend-build/xiconf-frontend.json

set NODE_ENV=development

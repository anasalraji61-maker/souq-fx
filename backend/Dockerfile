# MATRIX backend — صورة نشر بسيطة لاستضافة عامة (Railway/Render/Fly.io/VPS)
# راجع docs/DEPLOYMENT.md لشرح كامل لسبب وجود هذا الملف ولخطوات النشر.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# matrix.db (SQLite) يجب أن يعيش على قرص دائم (persistent volume) عند الاستضافة —
# بدونه يُمحى كل تسجيل مستخدمين/تنبيهات/رسائل عند كل إعادة نشر. راجع docs/DEPLOYMENT.md.
ENV PYTHONUNBUFFERED=1
EXPOSE 8110

CMD ["python", "run_api.py"]

# MATRIX backend — صورة نشر بسيطة لاستضافة عامة (Railway/Render/Fly.io/VPS)
# راجع docs/DEPLOYMENT.md لشرح كامل لسبب وجود هذا الملف ولخطوات النشر.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# matrix.db (SQLite) يجب أن يعيش على قرص دائم (persistent volume) عند الاستضافة —
# بدونه يُمحى كل تسجيل مستخدمين/تنبيهات/رسائل عند كل إعادة نشر. راجع docs/DEPLOYMENT.md.
#
# لذلك القاعدة **خارج /app**: القرص الدائم يُركَّب على مسار تختاره المنصّة، ولا يصحّ
# تركيبه فوق /app لأنه يحجب شيفرة التطبيق. اربط القرص على **/data** فحسب ولا شيء آخر.
# (المسار قابل للتغيير بنفس المتغيّر إن فرضت المنصّة مساراً آخر.)
ENV MATRIX_DB_PATH=/data/matrix.db
ENV PYTHONUNBUFFERED=1
EXPOSE 8110

CMD ["python", "run_api.py"]

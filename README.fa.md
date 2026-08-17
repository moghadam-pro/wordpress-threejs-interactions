# تعامل‌های Three.js برای وردپرس

این ریپو شامل دو کامپوننت مستقل و آمادهٔ استفاده در وردپرس است که با HTML معنایی، CSS اسکوپ‌شده، JavaScript خالص و Three.js ساخته شده‌اند:

- **کارت Bento تعاملی:** نور دنبال‌کنندهٔ موس روی لبه، tilt و parallax ظریف، میدان نقاط WebGL و دیالوگ دسترس‌پذیر.
- **Canvas وکتوری چهارحالته:** هندسهٔ تولیدشده با کد که بین فرم‌های شعاعی، نیم‌کره، نوارهای موجی و ساعت‌شنی morph می‌شود و نسبت به موس واکنش موضعی دارد.

![کارت Bento تعاملی](bento-card/previews/preview-hover.png)

## اجرای سریع

از ریشهٔ ریپو یک سرور محلی اجرا کنید:

```bash
python -m http.server 4173
```

سپس این آدرس‌ها را باز کنید:

- `http://localhost:4173/`
- `http://localhost:4173/bento-card/`
- `http://localhost:4173/vector-canvas/`

build یا نصب پکیج لازم نیست. Three.js نسخهٔ `0.178.0` از jsDelivr لود می‌شود؛ برای محیط بدون اینترنت می‌توانید فایل ماژول را روی هاست خودتان قرار دهید.

## نصب در وردپرس

1. پوشهٔ کامپوننت موردنظر را در child theme کپی کنید؛ برای نمونه:

   `wp-content/themes/your-child-theme/assets/vector-canvas/`

2. نمونهٔ موجود در `wordpress-functions.php` را به `functions.php` قالب فرزند اضافه و مسیر پوشه را اصلاح کنید.
3. محتوای `component.html` را در Custom HTML block، template part یا فایل PHP قالب قرار دهید.
4. CSS و JavaScript هر کامپوننت را فقط یک بار enqueue کنید.

نمونه‌ها برای `wp_enqueue_script_module()` در وردپرس 6.5 به بالا نوشته شده‌اند. راهنمای کامل در [مستند نصب وردپرس](docs/wordpress-integration.md) قرار دارد.

## کنترل چهار حالت Canvas

کنترل‌های نقطه‌ای داخل دمو صرفاً نمونه هستند. می‌توانید آن‌ها را حذف و دکمه‌های سایت خودتان را به API وصل کنید:

```js
window.WMVectorCanvas.setState('[data-wm-vector]', 0);
window.WMVectorCanvas.setState('[data-wm-vector]', 1);
window.WMVectorCanvas.setState('[data-wm-vector]', 2);
window.WMVectorCanvas.setState('[data-wm-vector]', 3);
```

تغییر شکل دو مرحله دارد: فرم جاری ابتدا در یک cloud ذره‌ای جمع می‌شود و سپس به توپولوژی بعدی باز می‌شود. حرکت موس نیز نقاط و خطوط نزدیک نشانگر را جابه‌جا می‌کند.

## نکات فنی

- هندسه‌ها، shaderها، متن‌ها و استایل‌ها مستقل و clean-room هستند.
- render خارج viewport یا هنگام مخفی بودن tab متوقف می‌شود.
- `devicePixelRatio` برای کنترل فشار GPU محدود شده است.
- حالت `prefers-reduced-motion` پشتیبانی می‌شود.
- این پروژه وابسته یا مورد تأیید Stripe نیست و هیچ سورس، لوگو یا asset اختصاصی از سایت مرجع را شامل نمی‌شود.

جزئیات بیشتر: [معماری](docs/architecture.md)، [سفارشی‌سازی](docs/customization.md)، [راهنمای وردپرس](docs/wordpress-integration.md).

## مجوز

کد و مستندات این ریپو تحت [مجوز MIT](LICENSE) منتشر شده‌اند.


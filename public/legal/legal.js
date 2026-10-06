/* Shared header/footer + contact address for MATRIX public pages.
 * Change the contact e-mail or the effective date in ONE place: here. */
(function () {
  var SITE = {
    name: 'MATRIX',
    contactEmail: 'anasalraji61@gmail.com',
    effectiveDate: '2026-10-06',
    effectiveDateAr: '6 تشرين الأول 2026',
  };
  window.MATRIX_SITE = SITE;

  var pages = [
    { href: '/legal/about.html', ar: 'عن MATRIX', en: 'About' },
    { href: '/legal/privacy.html', ar: 'الخصوصية', en: 'Privacy' },
    { href: '/legal/terms.html', ar: 'الشروط', en: 'Terms' },
    { href: '/legal/risk.html', ar: 'إخلاء المسؤولية', en: 'Risk' },
    { href: '/legal/delete-account.html', ar: 'حذف الحساب', en: 'Delete account' },
  ];

  var here = location.pathname.replace(/\/+$/, '');

  function navLinks() {
    return pages
      .map(function (p) {
        var cur = here === p.href ? ' aria-current="page"' : '';
        return '<a href="' + p.href + '"' + cur + '>' + p.ar + '</a>';
      })
      .join('');
  }

  var header = document.createElement('header');
  header.className = 'top';
  header.innerHTML =
    '<div class="top-inner">' +
    '<a class="brand" href="/" title="فتح التطبيق"><span class="brand-mark">M</span>' +
    '<span>MATRIX</span><small>PRO</small></a>' +
    '<nav aria-label="روابط الموقع">' + navLinks() + '<a href="/">فتح التطبيق</a></nav>' +
    '</div>';
  document.body.insertBefore(header, document.body.firstChild);

  var footer = document.createElement('footer');
  footer.innerHTML =
    '<div class="inner">' +
    '<span>© ' + new Date().getFullYear() + ' MATRIX — منصة تحليل فني تعليمية. ليست وسيطاً مالياً ولا تقدّم نصيحة استثمارية.</span>' +
    '<nav>' + navLinks() + '<a href="mailto:' + SITE.contactEmail + '">' + SITE.contactEmail + '</a></nav>' +
    '</div>';
  document.body.appendChild(footer);

  // Fill placeholders: <span data-site="contactEmail"></span>, data-site-href="mailto"
  var nodes = document.querySelectorAll('[data-site]');
  for (var i = 0; i < nodes.length; i++) {
    var key = nodes[i].getAttribute('data-site');
    if (SITE[key]) nodes[i].textContent = SITE[key];
  }
  var mails = document.querySelectorAll('[data-site-mailto]');
  for (var j = 0; j < mails.length; j++) {
    mails[j].setAttribute('href', 'mailto:' + SITE.contactEmail);
    if (!mails[j].textContent.trim()) mails[j].textContent = SITE.contactEmail;
  }
})();

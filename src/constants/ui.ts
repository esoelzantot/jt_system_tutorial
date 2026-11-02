/** Interface labels (not tutorial content, which comes from Firestore). */
export const UI = {
  brand: 'J&T Express',
  title: 'دليل نظام الشحن',
  subtitle: 'إجراءات النظام الداخلي والأسئلة الشائعة',
  skipToContent: 'تخطَّ إلى المحتوى',

  sectionsNav: 'أقسام الدليل',
  questionsCount: (n: number) => (n === 1 ? 'سؤال واحد' : n === 2 ? 'سؤالان' : n <= 10 ? `${n} أسئلة` : `${n} سؤالًا`),

  heroEyebrow: 'مركز المساعدة',
  heroTitleLead: 'كل ما تحتاجه لاستخدام',
  heroTitleAccent: 'نظام الشحن بثقة',
  heroText: 'إجراءات خطوة بخطوة، صور توضيحية من السيستم، وإجابات لأكثر الأسئلة شيوعًا — كلها في مكان واحد.',
  statSections: 'قسم',
  statQuestions: 'سؤال',
  statImages: 'صورة توضيحية',
  browseSections: 'تصفّح حسب القسم',
  footerNote: 'دليل داخلي لنظام الشحن',

  answerSteps: (n: number) => (n === 1 ? 'خطوة واحدة' : n === 2 ? 'خطوتان' : n <= 10 ? `${n} خطوات` : `${n} خطوة`),
  answerParagraph: 'شرح',

  searchLabel: 'ابحث في الدليل',
  searchPlaceholder: 'ابحث عن سؤال أو إجراء أو خطوة…',
  clearSearch: 'مسح البحث',
  resultsCount: (n: number) => (n === 0 ? 'لا توجد نتائج' : n === 1 ? 'نتيجة واحدة' : n === 2 ? 'نتيجتان' : `${n} نتائج`),
  resultsFor: 'نتائج البحث عن',
  stepLabel: (n: number) => `الخطوة ${n}`,
  noResultsTitle: 'لم نعثر على نتائج مطابقة',
  noResultsHint: 'جرّب كلمات أقل أو مختلفة، أو تحقق من الإملاء.',

  loading: 'جارٍ تحميل محتوى الدليل…',
  errorTitle: 'تعذّر تحميل المحتوى',
  errorHint: 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.',
  configErrorHint: 'إعدادات Firebase غير مكتملة. انسخ ملف ‎.env.example‎ إلى ‎.env.local‎ واملأ القيم.',
  retry: 'إعادة المحاولة',
  emptyTitle: 'لا يوجد محتوى بعد',
  emptyHint: 'لم تتم إضافة أي أقسام أو أسئلة إلى الدليل حتى الآن.',

  enlargeImage: 'تكبير الصورة',
  imageHint: 'اضغط على الصورة لعرضها بالحجم الكامل',
  viewerLabel: 'عارض الصور',
  zoomIn: 'تكبير',
  zoomOut: 'تصغير',
  resetZoom: 'إعادة الحجم الأصلي',
  close: 'إغلاق',
  imageLoadError: 'تعذّر تحميل الصورة',
} as const;

(function () {
  'use strict';
  if (window.KDLI18n) return;

  var STORAGE_KEY = 'kdl_language';
  var supported = ['es', 'en', 'zh-CN', 'hi', 'ar'];
  var textOriginals = new WeakMap();
  var attributeOriginals = new WeakMap();
  var applying = false;
  var observer;

  var rows = [
    ['Solicitud técnica', 'Technical request', '技术申请', 'तकनीकी अनुरोध', 'طلب فني'],
    ['Envía tu referencia o fotografía desde Contacto', 'Send your reference or photo from the Contact page', '从联系页面发送您的参考信息或照片', 'संपर्क पृष्ठ से अपना संदर्भ या फोटो भेजें', 'أرسل المرجع أو الصورة من صفحة الاتصال'],
    ['Completa tus datos, número de parte o descripción. La fotografía se adjunta directamente al abrir WhatsApp.', 'Enter your details, part number, or description. Attach the photo directly when WhatsApp opens.', '填写您的信息、零件编号或说明。打开 WhatsApp 后可直接附加照片。', 'अपनी जानकारी, पार्ट नंबर या विवरण भरें। WhatsApp खुलने पर फोटो सीधे संलग्न करें।', 'أدخل بياناتك أو رقم القطعة أو الوصف. أرفق الصورة مباشرة عند فتح واتساب.'],
    ['Abrir formulario de contacto', 'Open contact form', '打开联系表单', 'संपर्क फ़ॉर्म खोलें', 'فتح نموذج الاتصال'],
    ['Inicio', 'Home', '首页', 'होम', 'الرئيسية'],
    ['Productos', 'Products', '产品', 'उत्पाद', 'المنتجات'],
    ['Soluciones', 'Solutions', '解决方案', 'समाधान', 'الحلول'],
    ['Catálogos', 'Catalogs', '目录', 'कैटलॉग', 'الكتالوجات'],
    ['Contacto', 'Contact', '联系我们', 'संपर्क', 'اتصل بنا'],
    ['Ver todo', 'View all', '查看全部', 'सभी देखें', 'عرض الكل'],
    ['Buscar', 'Search', '搜索', 'खोजें', 'بحث'],
    ['Idioma', 'Language', '语言', 'भाषा', 'اللغة'],
    ['Idioma del sitio', 'Site language', '网站语言', 'साइट की भाषा', 'لغة الموقع'],
    ['Idiomas disponibles', 'Available languages', '可用语言', 'उपलब्ध भाषाएँ', 'اللغات المتاحة'],
    ['Seleccionar idioma. Actual: Español', 'Select language. Current: English', '选择语言。当前：简体中文', 'भाषा चुनें। वर्तमान: हिन्दी', 'اختر اللغة. الحالية: العربية'],
    ['Navegación principal', 'Main navigation', '主导航', 'मुख्य नेविगेशन', 'التنقل الرئيسي'],
    ['Navegación móvil', 'Mobile navigation', '移动导航', 'मोबाइल नेविगेशन', 'التنقل عبر الجوال'],
    ['Categorías y productos', 'Categories and products', '类别和产品', 'श्रेणियाँ और उत्पाद', 'الفئات والمنتجات'],
    ['Categorías de productos', 'Product categories', '产品类别', 'उत्पाद श्रेणियाँ', 'فئات المنتجات'],
    ['Cesta de cotización', 'Quote cart', '询价清单', 'कोटेशन कार्ट', 'سلة طلبات التسعير'],
    ['Productos en la cesta', 'Products in cart', '清单中的产品', 'कार्ट में उत्पाद', 'المنتجات في السلة'],
    ['Revisar cesta', 'Review cart', '查看清单', 'कार्ट देखें', 'مراجعة السلة'],
    ['Abrir menú', 'Open menu', '打开菜单', 'मेनू खोलें', 'فتح القائمة'],
    ['Cerrar menú', 'Close menu', '关闭菜单', 'मेनू बंद करें', 'إغلاق القائمة'],
    ['Cotizar por WhatsApp', 'Request a quote on WhatsApp', '通过 WhatsApp 询价', 'WhatsApp पर कोटेशन लें', 'اطلب عرض سعر عبر واتساب'],
    ['Cotizar o enviar referencia', 'Request a quote or send a reference', '询价或发送参考信息', 'कोटेशन लें या संदर्भ भेजें', 'اطلب عرض سعر أو أرسل مرجعًا'],
    ['Que tu línea', 'Keep your line', '让您的生产线', 'अपनी उत्पादन लाइन को', 'حافظ على خط إنتاجك'],
    ['siga', 'running', '持续', 'निरंतर', 'يعمل'],
    ['fluyendo.', 'smoothly.', '顺畅运行。', 'सुचारु रखें।', 'بسلاسة.'],
    ['Refacciones industriales, automatización y herramientas de corte para plantas que trabajan sin descanso. Envíanos tu número de parte, foto o problema y te ayudamos a encontrar la solución correcta.', 'Industrial spare parts, automation and cutting tools for plants that operate nonstop. Send us your part number, photo or problem and we will help you find the right solution.', '工业备件、自动化和切削工具，服务于持续运行的工厂。请发送零件编号、照片或问题，我们将帮助您找到合适的解决方案。', 'लगातार चलने वाले संयंत्रों के लिए औद्योगिक स्पेयर पार्ट्स, ऑटोमेशन और कटिंग टूल्स। अपना पार्ट नंबर, फोटो या समस्या भेजें और हम सही समाधान खोजने में आपकी मदद करेंगे।', 'قطع غيار صناعية وأتمتة وأدوات قطع للمصانع التي تعمل دون توقف. أرسل رقم القطعة أو صورة أو وصف المشكلة وسنساعدك في العثور على الحل المناسب.'],
    ['Busca por número de parte, marca, categoría, síntoma o sube foto', 'Search by part number, brand, category, symptom, or upload a photo', '按零件编号、品牌、类别、症状搜索，或上传照片', 'पार्ट नंबर, ब्रांड, श्रेणी, लक्षण से खोजें या फोटो अपलोड करें', 'ابحث برقم القطعة أو العلامة أو الفئة أو العطل، أو ارفع صورة'],
    ['Buscar productos y refacciones', 'Search products and spare parts', '搜索产品和备件', 'उत्पाद और स्पेयर पार्ट्स खोजें', 'البحث عن المنتجات وقطع الغيار'],
    ['Neumática', 'Pneumatics', '气动', 'न्यूमैटिक्स', 'الأنظمة الهوائية'],
    ['Hidráulica', 'Hydraulics', '液压', 'हाइड्रॉलिक्स', 'الأنظمة الهيدروليكية'],
    ['Sensores', 'Sensors', '传感器', 'सेंसर', 'المستشعرات'],
    ['Automatización', 'Automation', '自动化', 'ऑटोमेशन', 'الأتمتة'],
    ['Movimiento lineal', 'Linear motion', '直线运动', 'लीनियर मोशन', 'الحركة الخطية'],
    ['Insertos', 'Inserts', '刀片', 'इन्सर्ट', 'لقم القطع'],
    ['Cotización e identificación', 'Quoting and identification', '询价与识别', 'कोटेशन और पहचान', 'التسعير والتعرّف'],
    ['Cotiza o identifica', 'Request a quote or identify', '询价或识别', 'कोटेशन लें या पहचानें', 'اطلب سعرًا أو تعرّف على'],
    ['un componente.', 'a component.', '一个部件。', 'किसी कंपोनेंट को।', 'مكوّن.'],
    ['Comparte la marca o el número de parte si lo conoces. Si no, describe la falla o sube una foto para que un asesor reúna contigo los datos necesarios.', 'Share the brand or part number if you know it. Otherwise, describe the fault or upload a photo so an advisor can gather the required information with you.', '如果您知道品牌或零件编号，请提供。否则，请描述故障或上传照片，顾问将与您一起收集所需信息。', 'यदि ब्रांड या पार्ट नंबर पता है तो साझा करें। अन्यथा समस्या बताएं या फोटो अपलोड करें, ताकि सलाहकार आवश्यक जानकारी जुटा सके।', 'شارك العلامة أو رقم القطعة إن كنت تعرفه. وإلا فصف العطل أو ارفع صورة ليجمع المستشار معك المعلومات اللازمة.'],
    ['Sensor fallando', 'Sensor failure', '传感器故障', 'सेंसर में खराबी', 'عطل في المستشعر'],
    ['Cilindro con fuga', 'Leaking cylinder', '气缸泄漏', 'सिलेंडर में रिसाव', 'تسرّب في الأسطوانة'],
    ['Inserto desgastado', 'Worn insert', '刀片磨损', 'घिसा हुआ इन्सर्ट', 'لقمة قطع متآكلة'],
    ['Componente difícil de identificar', 'Hard-to-identify component', '难以识别的部件', 'पहचानने में कठिन कंपोनेंट', 'مكوّن يصعب التعرّف عليه'],
    ['Describe el síntoma o sube una foto', 'Describe the symptom or upload a photo', '描述症状或上传照片', 'लक्षण बताएं या फोटो अपलोड करें', 'صف العطل أو ارفع صورة'],
    ['Comparte placa, medidas o aplicación', 'Share the nameplate, dimensions, or application', '提供铭牌、尺寸或应用', 'नेमप्लेट, माप या उपयोग साझा करें', 'شارك لوحة البيانات أو المقاسات أو التطبيق'],
    ['Indica geometría, grado o envía foto', 'Provide geometry, grade, or a photo', '提供几何形状、牌号或照片', 'ज्यामिति, ग्रेड या फोटो दें', 'حدد الشكل أو الدرجة أو أرسل صورة'],
    ['Una foto y la aplicación ayudan a revisarlo', 'A photo and the application help us review it', '照片和应用信息有助于审核', 'फोटो और उपयोग की जानकारी समीक्षा में मदद करती है', 'تساعد الصورة ومعلومات التطبيق على مراجعته'],
    ['¿El componente está descontinuado?', 'Is the component discontinued?', '该部件是否已停产？', 'क्या कंपोनेंट बंद हो चुका है?', 'هل تم إيقاف هذا المكوّن؟'],
    ['Revisar una alternativa compatible', 'Review a compatible alternative', '审核兼容替代方案', 'संगत विकल्प की समीक्षा करें', 'مراجعة بديل متوافق'],
    ['¿Necesitas varias refacciones?', 'Do you need several spare parts?', '需要多个备件吗？', 'क्या आपको कई स्पेयर पार्ट्स चाहिए?', 'هل تحتاج إلى عدة قطع غيار؟'],
    ['Usar la cesta de cotización', 'Use the quote cart', '使用询价清单', 'कोटेशन कार्ट का उपयोग करें', 'استخدم سلة طلبات التسعير'],
    ['Asesoría especializada', 'Specialized advice', '专业咨询', 'विशेषज्ञ सलाह', 'استشارة متخصصة'],
    ['Información transparente', 'Transparent information', '信息透明', 'पारदर्शी जानकारी', 'معلومات واضحة'],
    ['Siguiente paso claro', 'Clear next step', '明确的下一步', 'स्पष्ट अगला कदम', 'خطوة تالية واضحة'],
    ['Revisión técnica de tu solicitud', 'Technical review of your request', '对您的请求进行技术审核', 'आपके अनुरोध की तकनीकी समीक्षा', 'مراجعة فنية لطلبك'],
    ['Validación antes de confirmar', 'Validation before confirmation', '确认前验证', 'पुष्टि से पहले सत्यापन', 'التحقق قبل التأكيد'],
    ['Seguimiento con folio', 'Tracking with a reference number', '使用编号跟踪', 'फोलियो नंबर से ट्रैकिंग', 'متابعة برقم مرجعي'],
    ['Encuentra lo que tu operación necesita', 'Find what your operation needs', '找到运营所需产品', 'अपने संचालन की जरूरत खोजें', 'اعثر على ما تحتاجه عملياتك'],
    ['Toca una categoría para ver datos para cotizar, fallas comunes y aplicaciones.', 'Select a category to see quote requirements, common faults, and applications.', '选择类别以查看询价所需信息、常见故障和应用。', 'कोटेशन जानकारी, सामान्य खराबियाँ और उपयोग देखने के लिए श्रेणी चुनें।', 'اختر فئة لعرض بيانات التسعير والأعطال الشائعة والتطبيقات.'],
    ['Ver catálogo completo', 'View full catalog', '查看完整目录', 'पूरा कैटलॉग देखें', 'عرض الكتالوج الكامل'],
    ['Cotizar esta categoría', 'Request a quote for this category', '询价此类别', 'इस श्रेणी का कोटेशन लें', 'اطلب سعرًا لهذه الفئة'],
    ['Neumática industrial', 'Industrial pneumatics', '工业气动', 'औद्योगिक न्यूमैटिक्स', 'الأنظمة الهوائية الصناعية'],
    ['Hidráulica industrial', 'Industrial hydraulics', '工业液压', 'औद्योगिक हाइड्रॉलिक्स', 'الأنظمة الهيدروليكية الصناعية'],
    ['Sensores y control', 'Sensors and control', '传感器与控制', 'सेंसर और नियंत्रण', 'المستشعرات والتحكم'],
    ['Herramientas de corte e insertos', 'Cutting tools and inserts', '切削工具与刀片', 'कटिंग टूल्स और इन्सर्ट', 'أدوات ولقم القطع'],
    ['Refrigeración industrial / IQF', 'Industrial refrigeration / IQF', '工业制冷 / IQF', 'औद्योगिक रेफ्रिजरेशन / IQF', 'التبريد الصناعي / IQF'],
    ['Sistemas eléctricos y de control', 'Electrical and control systems', '电气与控制系统', 'इलेक्ट्रिकल और कंट्रोल सिस्टम', 'الأنظمة الكهربائية وأنظمة التحكم'],
    ['Suministros industriales', 'Industrial supplies', '工业用品', 'औद्योगिक आपूर्ति', 'المستلزمات الصناعية'],
    ['Tecnología industrial para aplicaciones exigentes.', 'Industrial technology for demanding applications.', '面向严苛应用的工业技术。', 'कठिन अनुप्रयोगों के लिए औद्योगिक तकनीक।', 'تقنية صناعية للتطبيقات الصعبة.'],
    ['Te ayudamos a seleccionar el componente correcto según aplicación, compatibilidad y condiciones de trabajo.', 'We help you select the right component based on application, compatibility, and operating conditions.', '我们根据应用、兼容性和工作条件帮助您选择正确的部件。', 'हम उपयोग, संगतता और कार्य स्थितियों के अनुसार सही कंपोनेंट चुनने में मदद करते हैं।', 'نساعدك على اختيار المكوّن المناسب وفق التطبيق والتوافق وظروف التشغيل.'],
    ['Marcas', 'Brands', '品牌', 'ब्रांड', 'العلامات التجارية'],
    ['Marcas referenciales. KDL no afirma distribución exclusiva.', 'Reference brands. KDL does not claim exclusive distribution.', '品牌仅供参考。KDL 不声明独家经销权。', 'ब्रांड संदर्भ के लिए हैं। KDL विशेष वितरण का दावा नहीं करता।', 'العلامات للمرجعية. لا تدّعي KDL التوزيع الحصري.'],
    ['Centro de soporte KDL', 'KDL support center', 'KDL 支持中心', 'KDL सहायता केंद्र', 'مركز دعم KDL'],
    ['Todo para cotizar con menos fricción.', 'Everything you need for a smoother quote request.', '让询价更顺畅所需的一切。', 'आसान कोटेशन के लिए जरूरी सब कुछ।', 'كل ما تحتاجه لطلب سعر بسهولة.'],
    ['Descargar', 'Download', '下载', 'डाउनलोड', 'تنزيل'],
    ['Preguntas frecuentes', 'Frequently asked questions', '常见问题', 'अक्सर पूछे जाने वाले प्रश्न', 'الأسئلة الشائعة'],
    ['Fichas técnicas', 'Technical data sheets', '技术数据表', 'तकनीकी डेटा शीट', 'أوراق البيانات الفنية'],
    ['Guías rápidas de selección', 'Quick selection guides', '快速选型指南', 'त्वरित चयन गाइड', 'أدلة الاختيار السريع'],
    ['Checklists para cotizar', 'Quote checklists', '询价检查清单', 'कोटेशन चेकलिस्ट', 'قوائم التحقق لطلب السعر'],
    ['Cuéntanos qué necesitas', 'Tell us what you need', '告诉我们您的需求', 'हमें बताएं कि आपको क्या चाहिए', 'أخبرنا بما تحتاجه'],
    ['Marca o No. de parte', 'Brand or part number', '品牌或零件编号', 'ब्रांड या पार्ट नंबर', 'العلامة أو رقم القطعة'],
    ['Categoría (opcional)', 'Category (optional)', '类别（可选）', 'श्रेणी (वैकल्पिक)', 'الفئة (اختياري)'],
    ['Problema o aplicación', 'Problem or application', '问题或应用', 'समस्या या उपयोग', 'المشكلة أو التطبيق'],
    ['Foto de placa o componente (opcional)', 'Nameplate or component photo (optional)', '铭牌或部件照片（可选）', 'नेमप्लेट या कंपोनेंट फोटो (वैकल्पिक)', 'صورة لوحة البيانات أو المكوّن (اختياري)'],
    ['Enviar a un asesor KDL', 'Send to a KDL advisor', '发送给 KDL 顾问', 'KDL सलाहकार को भेजें', 'إرسال إلى مستشار KDL'],
    ['Conozco la pieza', 'I know the part', '我知道该零件', 'मुझे पार्ट पता है', 'أعرف القطعة'],
    ['Necesito identificarla', 'I need help identifying it', '我需要帮助识别', 'मुझे पहचानने में मदद चाहिए', 'أحتاج إلى التعرّف عليها'],
    ['Selecciona si la conoces', 'Select whether you know it', '选择您是否知道该零件', 'चुनें कि क्या आप इसे जानते हैं', 'حدد ما إذا كنت تعرفها'],
    ['Foto, placa, falla o aplicación', 'Photo, nameplate, fault, or application', '照片、铭牌、故障或应用', 'फोटो, नेमप्लेट, खराबी या उपयोग', 'صورة أو لوحة بيانات أو عطل أو تطبيق'],
    ['Tu nombre', 'Your name', '您的姓名', 'आपका नाम', 'اسمك'],
    ['Describe la falla, aplicación o detalle adicional…', 'Describe the fault, application, or any additional detail…', '描述故障、应用或其他详细信息…', 'खराबी, उपयोग या अतिरिक्त जानकारी बताएं…', 'صف العطل أو التطبيق أو أي تفاصيل إضافية…'],
    ['Atención desde Monterrey', 'Support from Monterrey', '蒙特雷服务', 'मोंटेरे से सहायता', 'خدمة من مونتيري'],
    ['Atención directa desde Monterrey', 'Direct support from Monterrey', '蒙特雷直接服务', 'मोंटेरे से सीधी सहायता', 'دعم مباشر من مونتيري'],
    ['Hablar con un asesor', 'Talk to an advisor', '联系顾问', 'सलाहकार से बात करें', 'تحدث مع مستشار'],
    ['Ver contacto', 'View contact details', '查看联系方式', 'संपर्क विवरण देखें', 'عرض بيانات الاتصال'],
    ['Navegación', 'Navigation', '导航', 'नेविगेशन', 'التنقل'],
    ['Soporte', 'Support', '支持', 'सहायता', 'الدعم'],
    ['Categorías', 'Categories', '类别', 'श्रेणियाँ', 'الفئات'],
    ['Lista de cotización', 'Quote list', '询价清单', 'कोटेशन सूची', 'قائمة طلب السعر'],
    ['Centro documental', 'Document center', '文档中心', 'दस्तावेज़ केंद्र', 'مركز المستندات'],
    ['Compatibilidad', 'Compatibility', '兼容性', 'संगतता', 'التوافق'],
    ['Servicios técnicos', 'Technical services', '技术服务', 'तकनीकी सेवाएँ', 'الخدمات الفنية'],
    ['Aviso de privacidad', 'Privacy notice', '隐私声明', 'गोपनीयता सूचना', 'إشعار الخصوصية'],
    ['Cilindros ISO 15552', 'ISO 15552 cylinders', 'ISO 15552 气缸', 'ISO 15552 सिलेंडर', 'أسطوانات ISO 15552'],
    ['Minicilindros ISO 6432', 'ISO 6432 mini cylinders', 'ISO 6432 微型气缸', 'ISO 6432 मिनी सिलेंडर', 'أسطوانات صغيرة ISO 6432'],
    ['Minicilindros aluminio MA', 'MA aluminum mini cylinders', 'MA 铝制微型气缸', 'MA एल्युमिनियम मिनी सिलेंडर', 'أسطوانات ألمنيوم صغيرة MA'],
    ['Cilindros compactos CQ2', 'CQ2 compact cylinders', 'CQ2 紧凑型气缸', 'CQ2 कॉम्पैक्ट सिलेंडर', 'أسطوانات مدمجة CQ2'],
    ['Cilindro compacto SDA', 'SDA compact cylinder', 'SDA 紧凑型气缸', 'SDA कॉम्पैक्ट सिलेंडर', 'أسطوانة مدمجة SDA'],
    ['Cilindros Clean CM2 / CJ2', 'Clean CM2 / CJ2 cylinders', 'Clean CM2 / CJ2 气缸', 'Clean CM2 / CJ2 सिलेंडर', 'أسطوانات Clean CM2 / CJ2'],
    ['Cilindros guiados MGP', 'MGP guided cylinders', 'MGP 导向气缸', 'MGP गाइडेड सिलेंडर', 'أسطوانات موجهة MGP'],
    ['Cilindros rotacionales MSQ', 'MSQ rotary cylinders', 'MSQ 旋转气缸', 'MSQ रोटरी सिलेंडर', 'أسطوانات دوارة MSQ'],
    ['Twin-rod TN / TR', 'TN / TR twin-rod cylinders', 'TN / TR 双杆气缸', 'TN / TR ट्विन-रॉड सिलेंडर', 'أسطوانات مزدوجة القضيب TN / TR'],
    ['Twist Clamp Cylinder', 'Twist clamp cylinder', '旋转夹紧气缸', 'ट्विस्ट क्लैम्प सिलेंडर', 'أسطوانة تثبيت دوارة'],
    ['Grippers neumáticos', 'Pneumatic grippers', '气动夹爪', 'न्यूमैटिक ग्रिपर', 'قوابض هوائية'],
    ['Amortiguadores hidráulicos', 'Hydraulic shock absorbers', '液压缓冲器', 'हाइड्रोलिक शॉक एब्जॉर्बर', 'ممتصات صدمات هيدروليكية'],
    ['sensor PNP', 'PNP sensor', 'PNP 传感器', 'PNP सेंसर', 'مستشعر PNP'],
    ['variador Delta', 'Delta drive', 'Delta 变频器', 'Delta ड्राइव', 'مغير سرعة Delta'],
    ['Por foto, placa o número de parte', 'By photo, nameplate, or part number', '通过照片、铭牌或零件编号', 'फोटो, नेमप्लेट या पार्ट नंबर से', 'عبر صورة أو لوحة بيانات أو رقم قطعة'],
    ['Alternativas compatibles', 'Compatible alternatives', '兼容替代方案', 'संगत विकल्प', 'بدائل متوافقة'],
    ['Para componentes difíciles de encontrar o descontinuados', 'For hard-to-find or discontinued components', '用于难以寻找或已停产的部件', 'मुश्किल से मिलने वाले या बंद हो चुके कंपोनेंट के लिए', 'للمكوّنات التي يصعب العثور عليها أو المتوقفة'],
    ['Catálogo multi-marca', 'Multi-brand catalog', '多品牌目录', 'मल्टी-ब्रांड कैटलॉग', 'كتالوج متعدد العلامات'],
    ['9 familias de producto industrial', '9 industrial product families', '9 个工业产品类别', '9 औद्योगिक उत्पाद श्रेणियाँ', '9 عائلات من المنتجات الصناعية'],
    ['Soporte técnico', 'Technical support', '技术支持', 'तकनीकी सहायता', 'الدعم الفني'],
    ['Cotización e identificación KDL', 'KDL quoting and identification', 'KDL 询价与识别', 'KDL कोटेशन और पहचान', 'التسعير والتعرّف من KDL'],
    ['Referencia visible para continuar', 'Visible reference to continue', '用于继续处理的可见参考信息', 'आगे बढ़ने के लिए स्पष्ट संदर्भ', 'مرجع واضح للمتابعة'],
    ['Consulta nuestro aviso de privacidad', 'Read our privacy notice', '查看我们的隐私声明', 'हमारी गोपनीयता सूचना देखें', 'راجع إشعار الخصوصية'],
    ['Enviar solicitud o fotografía', 'Send a request or photo', '发送请求或照片', 'अनुरोध या फोटो भेजें', 'أرسل طلبًا أو صورة'],
    ['Puedes cotizar una referencia conocida o pedir ayuda para identificarla.', 'You can request a quote for a known reference or ask for help identifying it.', '您可以为已知型号询价，或请求帮助识别。', 'आप ज्ञात संदर्भ का कोटेशन ले सकते हैं या उसे पहचानने में मदद मांग सकते हैं।', 'يمكنك طلب سعر لمرجع معروف أو طلب المساعدة في التعرّف عليه.'],
    ['Marca o número de parte', 'Brand or part number', '品牌或零件编号', 'ब्रांड या पार्ट नंबर', 'العلامة أو رقم القطعة'],
    ['Nombre *', 'Name *', '姓名 *', 'नाम *', 'الاسم *'],
    ['WhatsApp *', 'WhatsApp *', 'WhatsApp *', 'WhatsApp *', 'واتساب *'],
    ['Si no conoces la referencia, una foto y la aplicación son suficientes para iniciar la revisión. Al enviar, KDL usa estos datos para atender y dar seguimiento a tu solicitud. Consulta el', 'If you do not know the reference, a photo and the application are enough to start the review. When you submit, KDL uses this information to process and follow up on your request. Read the', '如果您不知道型号，照片和应用信息足以开始审核。提交后，KDL 将使用这些信息处理并跟进您的请求。请查看', 'यदि संदर्भ नहीं पता है, तो समीक्षा शुरू करने के लिए फोटो और उपयोग की जानकारी पर्याप्त है। भेजने पर KDL इस जानकारी का उपयोग आपके अनुरोध को संभालने और उसका अनुसरण करने के लिए करता है। देखें', 'إذا لم تعرف المرجع، فتكفي صورة ومعلومات التطبيق لبدء المراجعة. عند الإرسال تستخدم KDL هذه البيانات لمعالجة طلبك ومتابعته. راجع'],
    ['aviso de privacidad', 'privacy notice', '隐私声明', 'गोपनीयता सूचना', 'إشعار الخصوصية'],
    ['Cilindros, grippers, conexiones y tratamiento de aire para automatización.', 'Cylinders, grippers, fittings, and air treatment for automation.', '用于自动化的气缸、夹爪、接头和空气处理设备。', 'ऑटोमेशन के लिए सिलेंडर, ग्रिपर, फिटिंग और एयर ट्रीटमेंट।', 'أسطوانات وقوابض ووصلات ومعالجة هواء للأتمتة.'],
    ['Potencia hidráulica para prensas, inyección y maquinaria pesada.', 'Hydraulic power for presses, injection molding, and heavy machinery.', '用于压力机、注塑和重型机械的液压动力。', 'प्रेस, इंजेक्शन मोल्डिंग और भारी मशीनरी के लिए हाइड्रोलिक पावर।', 'قدرة هيدروليكية للمكابس والحقن والآلات الثقيلة.'],
    ['Detección, medición, visión, RFID y comunicación industrial.', 'Detection, measurement, vision, RFID, and industrial communication.', '检测、测量、视觉、RFID 和工业通信。', 'डिटेक्शन, मापन, विज़न, RFID और औद्योगिक संचार।', 'الكشف والقياس والرؤية وRFID والاتصالات الصناعية.'],
    ['PLC, HMI, variadores, servos y comunicación de procesos.', 'PLC, HMI, drives, servos, and process communication.', 'PLC、HMI、变频器、伺服和过程通信。', 'PLC, HMI, ड्राइव, सर्वो और प्रक्रिया संचार।', 'PLC وHMI ومغيرات السرعة والسيرفو واتصالات العمليات.'],
    ['Guías, husillos, actuadores y sistemas multieje de precisión.', 'Precision guides, ball screws, actuators, and multi-axis systems.', '精密导轨、滚珠丝杠、执行器和多轴系统。', 'प्रिसीजन गाइड, बॉल स्क्रू, एक्ट्यूएटर और मल्टी-एक्सिस सिस्टम।', 'أدلة لولبية ومشغلات وأنظمة متعددة المحاور عالية الدقة.'],
    ['Insertos de torneado, fresado, ranurado y carburo sólido.', 'Turning, milling, grooving, and solid-carbide tools.', '车削、铣削、切槽刀片和整体硬质合金工具。', 'टर्निंग, मिलिंग, ग्रूविंग और सॉलिड कार्बाइड टूल्स।', 'لقم للخراطة والتفريز والتخديد وأدوات كربيد صلب.'],
    ['Congelación rápida y línea de frío para alimentos y acuacultura.', 'Rapid freezing and cold-chain equipment for food and aquaculture.', '用于食品和水产养殖的速冻及冷链设备。', 'खाद्य और एक्वाकल्चर के लिए त्वरित फ्रीजिंग और कोल्ड-चेन उपकरण।', 'تجميد سريع ومعدات سلسلة تبريد للأغذية والاستزراع المائي.'],
    ['Componentes de tablero y distribución. Consulta modelos con un asesor.', 'Panel and distribution components. Ask an advisor about available models.', '面板和配电部件。请向顾问咨询具体型号。', 'पैनल और वितरण कंपोनेंट। उपलब्ध मॉडल के लिए सलाहकार से पूछें।', 'مكوّنات لوحات وتوزيع. استشر مستشارًا بشأن الطرازات.'],
    ['Componentes para mantenimiento y proyectos. Cuéntanos qué necesitas.', 'Components for maintenance and projects. Tell us what you need.', '用于维护和项目的部件。请告诉我们您的需求。', 'रखरखाव और परियोजनाओं के लिए कंपोनेंट। हमें अपनी जरूरत बताएं।', 'مكوّنات للصيانة والمشاريع. أخبرنا بما تحتاجه.'],
    ['Aplicaciones frecuentes', 'Common applications', '常见应用', 'सामान्य उपयोग', 'تطبيقات شائعة'],
    ['Mantenimiento 24/7', '24/7 maintenance', '全天候维护', '24/7 रखरखाव', 'صيانة على مدار الساعة'],
    ['CNC y metalmecánica', 'CNC and metalworking', 'CNC 与金属加工', 'CNC और मेटलवर्किंग', 'CNC وتشغيل المعادن'],
    ['Alimentos y refrigeración', 'Food and refrigeration', '食品与制冷', 'खाद्य और रेफ्रिजरेशन', 'الأغذية والتبريد'],
    ['Empaque', 'Packaging', '包装', 'पैकेजिंग', 'التعبئة والتغليف'],
    ['Robótica', 'Robotics', '机器人技术', 'रोबोटिक्स', 'الروبوتات'],
    ['Catálogos 2026, checklists, guías de selección y fichas técnicas.', '2026 catalogs, checklists, selection guides, and technical data sheets.', '2026 年目录、检查清单、选型指南和技术数据表。', '2026 कैटलॉग, चेकलिस्ट, चयन गाइड और तकनीकी डेटा शीट।', 'كتالوجات 2026 وقوائم تحقق وأدلة اختيار وأوراق بيانات فنية.'],
    ['Catálogo de suministros industriales', 'Industrial supplies catalog', '工业用品目录', 'औद्योगिक आपूर्ति कैटलॉग', 'كتالوج المستلزمات الصناعية'],
    ['Neumática, hidráulica, sensores, automatización y movimiento lineal.', 'Pneumatics, hydraulics, sensors, automation, and linear motion.', '气动、液压、传感器、自动化和直线运动。', 'न्यूमैटिक्स, हाइड्रॉलिक्स, सेंसर, ऑटोमेशन और लीनियर मोशन।', 'الأنظمة الهوائية والهيدروليكية والمستشعرات والأتمتة والحركة الخطية.'],
    ['Catálogo de herramientas de corte e insertos', 'Cutting tools and inserts catalog', '切削工具与刀片目录', 'कटिंग टूल्स और इन्सर्ट कैटलॉग', 'كتالوج أدوات ولقم القطع'],
    ['Insertos, carburo sólido, torneado, ranurado y fresado.', 'Inserts, solid carbide, turning, grooving, and milling.', '刀片、整体硬质合金、车削、切槽和铣削。', 'इन्सर्ट, सॉलिड कार्बाइड, टर्निंग, ग्रूविंग और मिलिंग।', 'لقم وكربيد صلب وخراطة وتخديد وتفريز.'],
    ['Qué datos reunir por categoría para una cotización más rápida.', 'What information to gather by category for a faster quote.', '按类别准备哪些信息可更快获得报价。', 'तेज़ कोटेशन के लिए श्रेणी के अनुसार कौन-सी जानकारी जुटाएँ।', 'البيانات المطلوبة حسب الفئة للحصول على سعر أسرع.'],
    ['Cómo elegir cilindro, sensor o inserto según tu aplicación.', 'How to choose a cylinder, sensor, or insert for your application.', '如何根据应用选择气缸、传感器或刀片。', 'अपने उपयोग के अनुसार सिलेंडर, सेंसर या इन्सर्ट कैसे चुनें।', 'كيفية اختيار أسطوانة أو مستشعر أو لقمة وفق تطبيقك.'],
    ['Hojas de datos por producto y marca para validar compatibilidad.', 'Product and brand data sheets for compatibility validation.', '用于验证兼容性的产品和品牌数据表。', 'संगतता सत्यापन के लिए उत्पाद और ब्रांड डेटा शीट।', 'أوراق بيانات حسب المنتج والعلامة للتحقق من التوافق.'],
    ['¿Necesito el número de parte exacto para cotizar?', 'Do I need the exact part number to request a quote?', '询价需要准确的零件编号吗？', 'क्या कोटेशन के लिए सटीक पार्ट नंबर जरूरी है?', 'هل أحتاج إلى رقم القطعة الدقيق لطلب السعر؟'],
    ['¿Manejan alternativas a componentes descontinuados?', 'Do you offer alternatives for discontinued components?', '是否提供停产部件的替代方案？', 'क्या बंद हो चुके कंपोनेंट के विकल्प उपलब्ध हैं?', 'هل توفرون بدائل للمكوّنات المتوقفة؟'],
    ['¿Cómo recibo la cotización?', 'How will I receive the quote?', '我将如何收到报价？', 'मुझे कोटेशन कैसे मिलेगा?', 'كيف أستلم عرض السعر؟'],
    ['¿Trabajan con compras y mantenimiento de planta?', 'Do you work with plant purchasing and maintenance teams?', '是否与工厂采购和维护团队合作？', 'क्या आप प्लांट खरीद और रखरखाव टीमों के साथ काम करते हैं?', 'هل تعملون مع فرق المشتريات وصيانة المصانع؟'],
    ['Ver ubicación y canales →', 'View location and contact channels →', '查看位置和联系方式 →', 'स्थान और संपर्क चैनल देखें →', 'عرض الموقع وقنوات التواصل ←'],
    ['Las alternativas se revisan según aplicación y condiciones de trabajo.', 'Alternatives are reviewed according to the application and operating conditions.', '替代方案将根据应用和工作条件进行审核。', 'विकल्पों की समीक्षा उपयोग और कार्य स्थितियों के अनुसार की जाती है।', 'تتم مراجعة البدائل وفق التطبيق وظروف التشغيل.'],
    ['Recibes seguimiento por el canal elegido para completar la cotización.', 'You receive follow-up through your chosen channel to complete the quote.', '我们将通过您选择的渠道跟进以完成报价。', 'कोटेशन पूरा करने के लिए आपके चुने हुए चैनल पर फॉलो-अप मिलेगा।', 'تتلقى المتابعة عبر القناة التي اخترتها لاستكمال عرض السعر.'],
    ['KDL: suministros, refacciones, automatización y soluciones industriales para que tu línea no se detenga.', 'KDL: industrial supplies, spare parts, automation, and solutions to keep your line running.', 'KDL：工业用品、备件、自动化和解决方案，让您的生产线持续运行。', 'KDL: आपकी लाइन चालू रखने के लिए औद्योगिक आपूर्ति, स्पेयर पार्ट्स, ऑटोमेशन और समाधान।', 'KDL: مستلزمات وقطع غيار وأتمتة وحلول صناعية لإبقاء خطك يعمل.'],
    ['Soluciones e identificación', 'Solutions and identification', '解决方案与识别', 'समाधान और पहचान', 'الحلول والتعرّف'],
    ['Industrias', 'Industries', '行业', 'उद्योग', 'القطاعات'],
    ['© 2026 KDL · Refacciones y Distribuciones KDL · Monterrey, N.L.', '© 2026 KDL · Refacciones y Distribuciones KDL · Monterrey, N.L.', '© 2026 KDL · Refacciones y Distribuciones KDL · 墨西哥蒙特雷', '© 2026 KDL · Refacciones y Distribuciones KDL · मॉन्टेरी, N.L.', '© 2026 KDL · Refacciones y Distribuciones KDL · مونتيري، نويفو ليون'],
    ['Refacciones industriales · Automatización · Herramientas de corte', 'Industrial spare parts · Automation · Cutting tools', '工业备件 · 自动化 · 切削工具', 'औद्योगिक स्पेयर पार्ट्स · ऑटोमेशन · कटिंग टूल्स', 'قطع غيار صناعية · أتمتة · أدوات قطع'],
    ['Servicios', 'Services', '服务', 'सेवाएँ', 'الخدمات'],
    ['Cotizar', 'Request a quote', '询价', 'कोटेशन लें', 'اطلب سعرًا'],
    ['Todas las categorías', 'All categories', '所有类别', 'सभी श्रेणियाँ', 'جميع الفئات'],
    ['Todas las marcas', 'All brands', '所有品牌', 'सभी ब्रांड', 'جميع العلامات'],
    ['Edición 2026', '2026 edition', '2026 年版', '2026 संस्करण', 'إصدار 2026'],
    ['Todos los tipos', 'All types', '所有类型', 'सभी प्रकार', 'جميع الأنواع'],
    ['Bombas', 'Pumps', '泵', 'पंप', 'مضخات'],
    ['Cilindros', 'Cylinders', '气缸', 'सिलेंडर', 'أسطوانات'],
    ['Eléctrico', 'Electrical', '电气', 'इलेक्ट्रिकल', 'كهربائي'],
    ['Guías', 'Guides', '导轨', 'गाइड', 'أدلة'],
    ['Inductivos', 'Inductive sensors', '电感式传感器', 'इंडक्टिव सेंसर', 'مستشعرات حثية'],
    ['Suministros', 'Supplies', '用品', 'आपूर्ति', 'مستلزمات'],
    ['Túneles IQF', 'IQF tunnels', 'IQF 隧道', 'IQF टनल', 'أنفاق IQF'],
    ['Válvulas', 'Valves', '阀门', 'वाल्व', 'صمامات'],
    ['Variadores', 'Drives', '变频器', 'ड्राइव', 'مغيرات سرعة'],
    ['Explora por categoría. Cada una agrupa las líneas que manejamos; entra para ver productos, datos para cotizar y alternativas compatibles.', 'Explore by category. Each category groups the product lines we handle; open one to view products, quote requirements, and compatible alternatives.', '按类别浏览。每个类别汇集我们提供的产品线；进入后可查看产品、询价要求和兼容替代方案。', 'श्रेणी के अनुसार देखें। हर श्रेणी में हमारी उत्पाद लाइनें हैं; उत्पाद, कोटेशन जानकारी और संगत विकल्प देखने के लिए खोलें।', 'تصفح حسب الفئة. تجمع كل فئة خطوط المنتجات التي نوفرها؛ افتحها لعرض المنتجات ومتطلبات التسعير والبدائل المتوافقة.'],
    ['productos', 'products', '产品', 'उत्पाद', 'منتجات'],
    ['Ver categoría', 'View category', '查看类别', 'श्रेणी देखें', 'عرض الفئة'],
    ['Suministros, refacciones, automatización y soluciones industriales · Monterrey, N.L.', 'Industrial supplies, spare parts, automation, and solutions · Monterrey, N.L.', '工业用品、备件、自动化和解决方案 · 墨西哥蒙特雷', 'औद्योगिक आपूर्ति, स्पेयर पार्ट्स, ऑटोमेशन और समाधान · मॉन्टेरी, N.L.', 'مستلزمات وقطع غيار وأتمتة وحلول صناعية · مونتيري، نويفو ليون'],
    ['© 2026 KDL · Soluciones Industriales · Monterrey, N.L. · Marcas referenciales; KDL no afirma distribución exclusiva.', '© 2026 KDL · Industrial Solutions · Monterrey, N.L. · Reference brands; KDL does not claim exclusive distribution.', '© 2026 KDL · 工业解决方案 · 墨西哥蒙特雷 · 品牌仅供参考；KDL 不声明独家经销权。', '© 2026 KDL · औद्योगिक समाधान · मॉन्टेरी, N.L. · ब्रांड संदर्भ के लिए हैं; KDL विशेष वितरण का दावा नहीं करता।', '© 2026 KDL · حلول صناعية · مونتيري، نويفو ليون · العلامات للمرجعية؛ لا تدّعي KDL التوزيع الحصري.'],
    ['© 2026 KDL · Soluciones Industriales · Monterrey, N.L.', '© 2026 KDL · Industrial Solutions · Monterrey, N.L.', '© 2026 KDL · 工业解决方案 · 墨西哥蒙特雷', '© 2026 KDL · औद्योगिक समाधान · मॉन्टेरी, N.L.', '© 2026 KDL · حلول صناعية · مونتيري، نويفو ليون'],
    ['Producto no encontrado', 'Product not found', '未找到产品', 'उत्पाद नहीं मिला', 'المنتج غير موجود'],
    ['El enlace no corresponde a un producto del catálogo. Explora las categorías o pídenos ayuda por WhatsApp.', 'This link does not match a catalog product. Explore the categories or ask us for help on WhatsApp.', '此链接与目录中的产品不匹配。请浏览类别或通过 WhatsApp 向我们求助。', 'यह लिंक कैटलॉग के किसी उत्पाद से मेल नहीं खाता। श्रेणियाँ देखें या WhatsApp पर मदद मांगें।', 'لا يتطابق الرابط مع منتج في الكتالوج. تصفح الفئات أو اطلب المساعدة عبر واتساب.'],
    ['Ver catálogo', 'View catalog', '查看目录', 'कैटलॉग देखें', 'عرض الكتالوج'],
    ['Pedir ayuda', 'Ask for help', '请求帮助', 'मदद मांगें', 'طلب المساعدة'],
    ['Encuentra catálogos KDL o solicita la ficha técnica de la marca y modelo exactos.', 'Find KDL catalogs or request the technical data sheet for the exact brand and model.', '查找 KDL 目录，或索取准确品牌和型号的技术数据表。', 'KDL कैटलॉग खोजें या सटीक ब्रांड और मॉडल की तकनीकी डेटा शीट मांगें।', 'اعثر على كتالوجات KDL أو اطلب ورقة البيانات الفنية للعلامة والطراز المحددين.'],
    ['Todos', 'All', '全部', 'सभी', 'الكل'],
    ['3 recursos disponibles', '3 resources available', '3 个可用资源', '3 संसाधन उपलब्ध', '3 موارد متاحة'],
    ['Pedir documento oficial a un asesor', 'Request an official document from an advisor', '向顾问索取官方文件', 'सलाहकार से आधिकारिक दस्तावेज़ मांगें', 'اطلب مستندًا رسميًا من مستشار'],
    ['Catálogo de suministros industriales 2026', '2026 industrial supplies catalog', '2026 年工业用品目录', '2026 औद्योगिक आपूर्ति कैटलॉग', 'كتالوج المستلزمات الصناعية 2026'],
    ['Neumática, hidráulica, sensores, automatización, movimiento lineal y refrigeración.', 'Pneumatics, hydraulics, sensors, automation, linear motion, and refrigeration.', '气动、液压、传感器、自动化、直线运动和制冷。', 'न्यूमैटिक्स, हाइड्रॉलिक्स, सेंसर, ऑटोमेशन, लीनियर मोशन और रेफ्रिजरेशन।', 'أنظمة هوائية وهيدروليكية ومستشعرات وأتمتة وحركة خطية وتبريد.'],
    ['Descargar PDF', 'Download PDF', '下载 PDF', 'PDF डाउनलोड करें', 'تنزيل PDF'],
    ['Catálogo de herramientas de corte 2026', '2026 cutting tools catalog', '2026 年切削工具目录', '2026 कटिंग टूल्स कैटलॉग', 'كتالوج أدوات القطع 2026'],
    ['Insertos, torneado, ranurado, carburo sólido y grados CVD/PVD.', 'Inserts, turning, grooving, solid carbide, and CVD/PVD grades.', '刀片、车削、切槽、整体硬质合金和 CVD/PVD 牌号。', 'इन्सर्ट, टर्निंग, ग्रूविंग, सॉलिड कार्बाइड और CVD/PVD ग्रेड।', 'لقم وخراطة وتخديد وكربيد صلب ودرجات CVD/PVD.'],
    ['Requiere marca y modelo', 'Brand and model required', '需要品牌和型号', 'ब्रांड और मॉडल आवश्यक', 'يتطلب العلامة والطراز'],
    ['Ficha técnica oficial', 'Official technical data sheet', '官方技术数据表', 'आधिकारिक तकनीकी डेटा शीट', 'ورقة بيانات فنية رسمية'],
    ['Hoja de datos correspondiente a la marca, serie y variante exactas.', 'Data sheet for the exact brand, series, and variant.', '与准确品牌、系列和变体对应的数据表。', 'सटीक ब्रांड, सीरीज़ और वैरिएंट की डेटा शीट।', 'ورقة البيانات المطابقة للعلامة والسلسلة والمتغير المحدد.'],
    ['Pedir a un asesor', 'Ask an advisor', '咨询顾问', 'सलाहकार से पूछें', 'اطلب من مستشار'],
    ['Consulta productos y documentación directamente con el fabricante.', 'View products and documentation directly from the manufacturer.', '直接向制造商查看产品和文档。', 'उत्पाद और दस्तावेज़ सीधे निर्माता से देखें।', 'راجع المنتجات والوثائق مباشرة لدى الشركة المصنعة.'],
    ['Los dos catálogos KDL marcados como', 'The two KDL catalogs marked as', '标记为以下内容的两份 KDL 目录', 'इस रूप में चिह्नित दो KDL कैटलॉग', 'كتالوجا KDL المشار إليهما بعبارة'],
    ['existen en este sitio. Las tarjetas siguientes abren sitios externos oficiales; Zenso abre la página de un distribuidor autorizado en México. Si no localizas el documento exacto, KDL puede ayudarte a solicitarlo con marca, modelo y número de parte.', 'are available on this site. The following cards open official external sites; Zenso opens the page of an authorized distributor in Mexico. If you cannot find the exact document, KDL can help request it using the brand, model, and part number.', '可在本网站获取。以下卡片将打开官方外部网站；Zenso 将打开墨西哥授权经销商页面。如果找不到准确文件，KDL 可根据品牌、型号和零件编号协助索取。', 'इस साइट पर उपलब्ध हैं। आगे के कार्ड आधिकारिक बाहरी साइटें खोलते हैं; Zenso मेक्सिको के अधिकृत वितरक का पेज खोलता है। सही दस्तावेज़ न मिलने पर KDL ब्रांड, मॉडल और पार्ट नंबर से उसे मंगाने में मदद कर सकता है।', 'متاحان في هذا الموقع. تفتح البطاقات التالية مواقع خارجية رسمية؛ وتفتح بطاقة Zenso صفحة موزع معتمد في المكسيك. إذا لم تجد المستند المحدد، يمكن لـKDL مساعدتك في طلبه باستخدام العلامة والطراز ورقم القطعة.'],
    ['Sensores · IO-Link', 'Sensors · IO-Link', '传感器 · IO-Link', 'सेंसर · IO-Link', 'مستشعرات · IO-Link'],
    ['Visitar sitio oficial', 'Visit official site', '访问官方网站', 'आधिकारिक साइट देखें', 'زيارة الموقع الرسمي'],
    ['Sensores · visión', 'Sensors · vision', '传感器 · 视觉', 'सेंसर · विज़न', 'مستشعرات · رؤية'],
    ['Refrigeración / IQF', 'Refrigeration / IQF', '制冷 / IQF', 'रेफ्रिजरेशन / IQF', 'تبريد / IQF'],
    ['Componentes', 'Components', '部件', 'कंपोनेंट', 'مكوّنات'],
    ['Ver distribuidor autorizado', 'View authorized distributor', '查看授权经销商', 'अधिकृत वितरक देखें', 'عرض الموزع المعتمد'],
    ['¿Necesitas una ficha técnica específica?', 'Do you need a specific technical data sheet?', '需要特定的技术数据表吗？', 'क्या आपको किसी खास तकनीकी डेटा शीट की जरूरत है?', 'هل تحتاج إلى ورقة بيانات فنية محددة؟'],
    ['Dinos marca, modelo o número de parte y te enviamos la hoja de datos o una alternativa compatible.', 'Tell us the brand, model, or part number and we will send the data sheet or a compatible alternative.', '请提供品牌、型号或零件编号，我们将发送数据表或兼容替代方案。', 'ब्रांड, मॉडल या पार्ट नंबर बताएं और हम डेटा शीट या संगत विकल्प भेजेंगे।', 'أخبرنا بالعلامة أو الطراز أو رقم القطعة وسنرسل ورقة البيانات أو بديلًا متوافقًا.'],
    ['Pedir documento oficial', 'Request official document', '索取官方文件', 'आधिकारिक दस्तावेज़ मांगें', 'طلب مستند رسمي'],
    ['Escribe la marca, modelo o número de parte de la pieza obsoleta. Te sugerimos opciones del catálogo y validamos compatibilidad según medidas, aplicación y condiciones de trabajo.', 'Enter the brand, model, or part number of the obsolete part. We suggest catalog options and validate compatibility based on dimensions, application, and operating conditions.', '输入停产零件的品牌、型号或零件编号。我们将推荐目录选项，并根据尺寸、应用和工作条件验证兼容性。', 'पुराने पार्ट का ब्रांड, मॉडल या पार्ट नंबर लिखें। हम कैटलॉग विकल्प सुझाते हैं और माप, उपयोग व कार्य स्थितियों के आधार पर संगतता सत्यापित करते हैं।', 'اكتب العلامة أو الطراز أو رقم القطعة القديمة. نقترح خيارات من الكتالوج ونتحقق من التوافق وفق المقاسات والتطبيق وظروف التشغيل.'],
    ['Buscar alternativa', 'Find an alternative', '寻找替代方案', 'विकल्प खोजें', 'البحث عن بديل'],
    ['Ejemplos:', 'Examples:', '示例：', 'उदाहरण:', 'أمثلة:'],
    ['sensor PNP M12', 'M12 PNP sensor', 'M12 PNP 传感器', 'M12 PNP सेंसर', 'مستشعر PNP M12'],
    ['cilindro Ø63', 'Ø63 cylinder', 'Ø63 气缸', 'Ø63 सिलेंडर', 'أسطوانة Ø63'],
    ['guía lineal HIWIN', 'HIWIN linear guide', 'HIWIN 直线导轨', 'HIWIN लीनियर गाइड', 'دليل خطي HIWIN'],
    ['Escribe tu pieza', 'Enter your part', '输入您的零件', 'अपना पार्ट लिखें', 'اكتب قطعتك'],
    ['Marca, modelo, número de parte o el síntoma. Aunque esté incompleto.', 'Brand, model, part number, or symptom, even if incomplete.', '品牌、型号、零件编号或症状，即使信息不完整也可以。', 'ब्रांड, मॉडल, पार्ट नंबर या लक्षण, भले जानकारी अधूरी हो।', 'العلامة أو الطراز أو رقم القطعة أو العَرَض، حتى إن كانت المعلومات غير مكتملة.'],
    ['Vemos alternativas', 'We review alternatives', '我们审核替代方案', 'हम विकल्प देखते हैं', 'نراجع البدائل'],
    ['Te mostramos opciones del catálogo que suelen reemplazarla.', 'We show catalog options that commonly replace it.', '我们会展示目录中通常可替代它的选项。', 'हम कैटलॉग के ऐसे विकल्प दिखाते हैं जो आम तौर पर इसे बदल सकते हैं।', 'نعرض خيارات من الكتالوج تُستخدم عادةً بدلًا منها.'],
    ['Validamos y cotizamos', 'We validate and quote', '我们验证并报价', 'हम सत्यापित कर कोटेशन देते हैं', 'نتحقق ونقدّم السعر'],
    ['Un asesor confirma compatibilidad por medidas, aplicación y condiciones.', 'An advisor confirms compatibility based on dimensions, application, and conditions.', '顾问将根据尺寸、应用和条件确认兼容性。', 'सलाहकार माप, उपयोग और स्थितियों के आधार पर संगतता की पुष्टि करता है।', 'يؤكد المستشار التوافق وفق المقاسات والتطبيق والظروف.'],
    ['Herramienta neumática', 'Pneumatic tool', '气动工具', 'न्यूमैटिक टूल', 'أداة هوائية'],
    ['Estima el consumo teórico de un cilindro de doble efecto para dimensionar la preparación y el suministro de aire.', 'Estimate the theoretical consumption of a double-acting cylinder to size the air preparation and supply.', '估算双作用气缸的理论耗气量，以确定空气处理和供气系统的规格。', 'एयर तैयारी और आपूर्ति का आकार तय करने के लिए डबल-एक्टिंग सिलेंडर की सैद्धांतिक खपत का अनुमान लगाएँ।', 'قدّر الاستهلاك النظري لأسطوانة مزدوجة الفعل لتحديد حجم تجهيز الهواء وإمداده.'],
    ['Ver cilindros neumáticos →', 'View pneumatic cylinders →', '查看气动气缸 →', 'न्यूमैटिक सिलेंडर देखें →', 'عرض الأسطوانات الهوائية ←'],
    ['Ø émbolo (mm)', 'Piston Ø (mm)', '活塞直径 (mm)', 'पिस्टन Ø (mm)', 'قطر المكبس (مم)'],
    ['Carrera (mm)', 'Stroke (mm)', '行程 (mm)', 'स्ट्रोक (mm)', 'الشوط (مم)'],
    ['Presión (bar)', 'Pressure (bar)', '压力 (bar)', 'दबाव (bar)', 'الضغط (بار)'],
    ['Ciclos / min', 'Cycles / min', '循环次数 / 分钟', 'साइकिल / मिनट', 'دورات / دقيقة'],
    ['Consumo estimado', 'Estimated consumption', '预计耗气量', 'अनुमानित खपत', 'الاستهلاك التقديري'],
    ['NL por ciclo · doble efecto', 'NL per cycle · double acting', '每循环 NL · 双作用', 'NL प्रति साइकिल · डबल एक्टिंग', 'NL لكل دورة · مزدوجة الفعل'],
    ['Estimación aproximada: no incluye el volumen del vástago, fugas ni accesorios. La selección final debe confirmarse con un asesor.', 'Approximate estimate: excludes rod volume, leaks, and accessories. Final selection must be confirmed with an advisor.', '近似估算：不包括活塞杆体积、泄漏和附件。最终选型须由顾问确认。', 'अनुमानित मान: इसमें रॉड का आयतन, रिसाव और एक्सेसरी शामिल नहीं हैं। अंतिम चयन की पुष्टि सलाहकार से कराएँ।', 'تقدير تقريبي: لا يشمل حجم القضيب أو التسربات أو الملحقات. يجب تأكيد الاختيار النهائي مع مستشار.'],
    ['Usar resultado para cotizar', 'Use result for quote', '使用结果询价', 'परिणाम से कोटेशन लें', 'استخدم النتيجة لطلب السعر'],
    ['© 2026 KDL · Soluciones Industriales · Monterrey, N.L. · Validamos compatibilidad; marcas referenciales.', '© 2026 KDL · Industrial Solutions · Monterrey, N.L. · We validate compatibility; reference brands.', '© 2026 KDL · 工业解决方案 · 墨西哥蒙特雷 · 我们验证兼容性；品牌仅供参考。', '© 2026 KDL · औद्योगिक समाधान · मॉन्टेरी, N.L. · हम संगतता सत्यापित करते हैं; ब्रांड संदर्भ के लिए हैं।', '© 2026 KDL · حلول صناعية · مونتيري، نويفو ليون · نتحقق من التوافق؛ العلامات للمرجعية.'],
    ['Entrada rápida', 'Quick entry', '快速添加', 'त्वरित प्रविष्टि', 'إدخال سريع'],
    ['Número de parte, código o tu referencia · y cantidad.', 'Part number, code, or your reference · and quantity.', '零件编号、代码或您的参考信息 · 以及数量。', 'पार्ट नंबर, कोड या आपका संदर्भ · और मात्रा।', 'رقم القطعة أو الرمز أو مرجعك · والكمية.'],
    ['Pieza / No. de parte', 'Part / Part number', '零件 / 零件编号', 'पार्ट / पार्ट नंबर', 'القطعة / رقم القطعة'],
    ['Piezas', 'Units', '件数', 'पीस', 'قطع'],
    ['Añadir', 'Add', '添加', 'जोड़ें', 'إضافة'],
    ['Todavía no hay artículos en tu cesta', 'Your cart is still empty', '您的清单仍为空', 'आपका कार्ट अभी खाली है', 'سلتك ما زالت فارغة'],
    ['Agrega refacciones desde el catálogo o por número de parte arriba.', 'Add spare parts from the catalog or by part number above.', '从目录中添加备件，或在上方输入零件编号。', 'कैटलॉग से या ऊपर पार्ट नंबर द्वारा स्पेयर पार्ट्स जोड़ें।', 'أضف قطع غيار من الكتالوج أو باستخدام رقم القطعة أعلاه.'],
    ['Ir al catálogo', 'Go to catalog', '前往目录', 'कैटलॉग पर जाएँ', 'الانتقال إلى الكتالوج'],
    ['Enviar cotización', 'Send quote request', '发送询价请求', 'कोटेशन अनुरोध भेजें', 'إرسال طلب السعر'],
    ['Un asesor técnico te responde con disponibilidad y precio. Las fotos se adjuntan en el chat.', 'A technical advisor responds with availability and price. Photos are attached in the chat.', '技术顾问将回复供货情况和价格。照片会在聊天中附上。', 'तकनीकी सलाहकार उपलब्धता और कीमत बताएगा। फोटो चैट में संलग्न किए जाते हैं।', 'يرد مستشار فني بالتوفر والسعر. تُرفق الصور في المحادثة.'],
    ['Enviar por WhatsApp', 'Send via WhatsApp', '通过 WhatsApp 发送', 'WhatsApp से भेजें', 'الإرسال عبر واتساب'],
    ['Correo', 'Email', '电子邮件', 'ईमेल', 'البريد الإلكتروني'],
    ['Agrega al menos una pieza para habilitar los canales de envío.', 'Add at least one part to enable the submission channels.', '至少添加一个零件以启用发送渠道。', 'भेजने के चैनल सक्रिय करने के लिए कम से कम एक पार्ट जोड़ें।', 'أضف قطعة واحدة على الأقل لتفعيل قنوات الإرسال.'],
    ['Para cotizar más rápido', 'For a faster quote', '更快获得报价', 'तेज़ कोटेशन के लिए', 'للحصول على سعر أسرع'],
    ['· Marca y modelo (si lo tienes)', '· Brand and model (if available)', '· 品牌和型号（如有）', '· ब्रांड और मॉडल (यदि उपलब्ध)', '· العلامة والطراز (إن توفرا)'],
    ['· Foto de la placa o pieza', '· Photo of the nameplate or part', '· 铭牌或零件照片', '· नेमप्लेट या पार्ट की फोटो', '· صورة لوحة البيانات أو القطعة'],
    ['· Medidas o aplicación', '· Dimensions or application', '· 尺寸或应用', '· माप या उपयोग', '· المقاسات أو التطبيق'],
    ['La vía más rápida es WhatsApp: mándanos foto de la pieza o el número de parte y te ayudamos a identificar la solución correcta.', 'The fastest option is WhatsApp: send us a photo of the part or the part number and we will help identify the right solution.', '最快的方式是 WhatsApp：发送零件照片或零件编号，我们将帮助您确定合适的解决方案。', 'सबसे तेज़ तरीका WhatsApp है: पार्ट की फोटो या पार्ट नंबर भेजें और हम सही समाधान पहचानने में मदद करेंगे।', 'أسرع وسيلة هي واتساب: أرسل صورة القطعة أو رقمها وسنساعدك في تحديد الحل المناسب.'],
    ['La vía más rápida con un asesor técnico.', 'The fastest way to reach a technical advisor.', '联系技术顾问的最快方式。', 'तकनीकी सलाहकार तक पहुँचने का सबसे तेज़ तरीका।', 'أسرع وسيلة للتواصل مع مستشار فني.'],
    ['Enviar foto de la pieza', 'Send a photo of the part', '发送零件照片', 'पार्ट की फोटो भेजें', 'إرسال صورة القطعة'],
    ['Mándanos imagen de la placa o el componente.', 'Send us an image of the nameplate or component.', '向我们发送铭牌或部件图片。', 'नेमप्लेट या कंपोनेंट की तस्वीर भेजें।', 'أرسل صورة لوحة البيانات أو المكوّن.'],
    ['Enviar número de parte', 'Send part number', '发送零件编号', 'पार्ट नंबर भेजें', 'إرسال رقم القطعة'],
    ['Marca y No. de parte para cotizar directo.', 'Brand and part number for a direct quote.', '提供品牌和零件编号以直接询价。', 'सीधे कोटेशन के लिए ब्रांड और पार्ट नंबर।', 'العلامة ورقم القطعة لطلب سعر مباشر.'],
    ['Validamos disponibilidad o alternativa compatible.', 'We validate availability or a compatible alternative.', '我们确认供货情况或兼容替代方案。', 'हम उपलब्धता या संगत विकल्प सत्यापित करते हैं।', 'نتحقق من التوفر أو من بديل متوافق.'],
    ['Llena lo que tengas a la mano; abrimos WhatsApp con tus datos.', 'Enter the information you have; we will open WhatsApp with your details.', '填写您现有的信息；我们将带着这些信息打开 WhatsApp。', 'जो जानकारी उपलब्ध है वह भरें; हम आपके विवरण के साथ WhatsApp खोलेंगे।', 'أدخل المعلومات المتوفرة لديك؛ وسنفتح واتساب مع بياناتك.'],
    ['Al enviar, KDL utilizará tus datos para atender y dar seguimiento a la solicitud. Consulta el', 'When you submit, KDL will use your information to process and follow up on the request. Read the', '提交后，KDL 将使用您的信息处理并跟进请求。请查看', 'भेजने पर KDL आपकी जानकारी का उपयोग अनुरोध को संभालने और उसका अनुसरण करने के लिए करेगा। देखें', 'عند الإرسال ستستخدم KDL بياناتك لمعالجة الطلب ومتابعته. راجع'],
    ['. La foto se adjunta directamente en WhatsApp.', '. The photo is attached directly in WhatsApp.', '。照片将直接在 WhatsApp 中附加。', '। फोटो सीधे WhatsApp में संलग्न की जाती है।', '. تُرفق الصورة مباشرة في واتساب.'],
    ['Ubicación', 'Location', '位置', 'स्थान', 'الموقع'],
    ['Ver ubicación en el mapa →', 'View location on the map →', '在地图上查看位置 →', 'मानचित्र पर स्थान देखें →', 'عرض الموقع على الخريطة ←'],
    ['Horario de atención', 'Business hours', '服务时间', 'कार्य समय', 'ساعات العمل'],
    ['Lunes a viernes, de 8:00 a.m. a 6:00 p.m.', 'Monday to Friday, 8:00 a.m. to 6:00 p.m.', '周一至周五，上午 8:00 至下午 6:00。', 'सोमवार से शुक्रवार, सुबह 8:00 से शाम 6:00 तक।', 'من الاثنين إلى الجمعة، من 8:00 صباحًا إلى 6:00 مساءً.'],
    ['Puedes dejar tu mensaje por WhatsApp fuera de horario y lo atenderemos al reanudar actividades.', 'You can leave a WhatsApp message outside business hours and we will respond when operations resume.', '您可以在非工作时间通过 WhatsApp 留言，我们将在恢复营业后回复。', 'कार्य समय के बाहर WhatsApp संदेश छोड़ सकते हैं; काम फिर शुरू होने पर हम जवाब देंगे।', 'يمكنك ترك رسالة عبر واتساب خارج ساعات العمل وسنرد عند استئناف العمل.'],
    ['Marca y modelo (si lo tienes)', 'Brand and model (if available)', '品牌和型号（如有）', 'ब्रांड और मॉडल (यदि उपलब्ध)', 'العلامة والطراز (إن توفرا)'],
    ['Número de parte o foto de la placa', 'Part number or nameplate photo', '零件编号或铭牌照片', 'पार्ट नंबर या नेमप्लेट की फोटो', 'رقم القطعة أو صورة لوحة البيانات'],
    ['Medidas o aplicación', 'Dimensions or application', '尺寸或应用', 'माप या उपयोग', 'المقاسات أو التطبيق'],
    ['Cantidad y urgencia', 'Quantity and urgency', '数量和紧急程度', 'मात्रा और तात्कालिकता', 'الكمية ودرجة الاستعجال'],
    ['Encuentra la familia de producto, el contexto industrial y el tipo de apoyo que necesitas, sin repetir el mismo proceso en páginas distintas.', 'Find the product family, industrial context, and type of support you need without repeating the same process across different pages.', '查找所需的产品类别、行业场景和支持类型，无需在不同页面重复相同流程。', 'अलग-अलग पेजों पर वही प्रक्रिया दोहराए बिना उत्पाद श्रेणी, औद्योगिक संदर्भ और आवश्यक सहायता खोजें।', 'اعثر على عائلة المنتج والسياق الصناعي ونوع الدعم الذي تحتاجه دون تكرار العملية نفسها في صفحات مختلفة.'],
    ['Parte del tipo de tecnología que necesitas y revisa productos, datos para cotizar y aplicaciones.', 'Start with the technology you need and review products, quote requirements, and applications.', '从所需技术类型开始，查看产品、询价要求和应用。', 'अपनी आवश्यक तकनीक से शुरू करें और उत्पाद, कोटेशन जानकारी व उपयोग देखें।', 'ابدأ بنوع التقنية التي تحتاجها وراجع المنتجات ومتطلبات التسعير والتطبيقات.'],
    ['Automatización y control', 'Automation and control', '自动化与控制', 'ऑटोमेशन और नियंत्रण', 'الأتمتة والتحكم'],
    ['Ver productos →', 'View products →', '查看产品 →', 'उत्पाद देखें →', 'عرض المنتجات ←'],
    ['Movimiento y actuación', 'Motion and actuation', '运动与执行', 'मोशन और एक्ट्यूएशन', 'الحركة والتشغيل'],
    ['Neumática, hidráulica, guías, husillos y actuadores para movimiento industrial.', 'Pneumatics, hydraulics, guides, ball screws, and actuators for industrial motion.', '用于工业运动的气动、液压、导轨、滚珠丝杠和执行器。', 'औद्योगिक गति के लिए न्यूमैटिक्स, हाइड्रॉलिक्स, गाइड, बॉल स्क्रू और एक्ट्यूएटर।', 'أنظمة هوائية وهيدروليكية وأدلة ولولبيات ومشغلات للحركة الصناعية.'],
    ['Herramientas de corte', 'Cutting tools', '切削工具', 'कटिंग टूल्स', 'أدوات القطع'],
    ['Insertos, portaherramientas, carburo sólido y soluciones para maquinado.', 'Inserts, toolholders, solid carbide, and machining solutions.', '刀片、刀柄、整体硬质合金和加工解决方案。', 'इन्सर्ट, टूलहोल्डर, सॉलिड कार्बाइड और मशीनिंग समाधान।', 'لقم وحوامل أدوات وكربيد صلب وحلول للتشغيل.'],
    ['Equipos y componentes para congelación, proceso y cadena de frío.', 'Equipment and components for freezing, processing, and the cold chain.', '用于冷冻、加工和冷链的设备与部件。', 'फ्रीजिंग, प्रोसेसिंग और कोल्ड चेन के लिए उपकरण और कंपोनेंट।', 'معدات ومكوّنات للتجميد والمعالجة وسلسلة التبريد.'],
    ['Selecciona el contexto de operación para que un asesor considere ambiente, montaje y condiciones de trabajo.', 'Select the operating context so an advisor can consider the environment, mounting, and operating conditions.', '选择运行场景，以便顾问考虑环境、安装和工作条件。', 'संचालन संदर्भ चुनें ताकि सलाहकार वातावरण, माउंटिंग और कार्य स्थितियों पर विचार कर सके।', 'حدد سياق التشغيل ليأخذ المستشار البيئة والتركيب وظروف العمل في الاعتبار.'],
    ['Alimentos y bebidas', 'Food and beverages', '食品与饮料', 'खाद्य और पेय', 'الأغذية والمشروبات'],
    ['Componentes para proceso, refrigeración y condiciones higiénicas.', 'Components for processing, refrigeration, and hygienic conditions.', '用于加工、制冷和卫生环境的部件。', 'प्रोसेसिंग, रेफ्रिजरेशन और स्वच्छ परिस्थितियों के लिए कंपोनेंट।', 'مكوّنات للمعالجة والتبريد والظروف الصحية.'],
    ['Cotizar para esta industria →', 'Request a quote for this industry →', '为此行业询价 →', 'इस उद्योग के लिए कोटेशन लें →', 'اطلب سعرًا لهذا القطاع ←'],
    ['Manufactura', 'Manufacturing', '制造业', 'विनिर्माण', 'التصنيع'],
    ['Automatización, sensores y refacciones para producción continua.', 'Automation, sensors, and spare parts for continuous production.', '用于连续生产的自动化、传感器和备件。', 'निरंतर उत्पादन के लिए ऑटोमेशन, सेंसर और स्पेयर पार्ट्स।', 'أتمتة ومستشعرات وقطع غيار للإنتاج المستمر.'],
    ['Metal-mecánica', 'Metalworking', '金属加工', 'मेटलवर्किंग', 'تشغيل المعادن'],
    ['Corte, movimiento lineal y componentes de máquina.', 'Cutting, linear motion, and machine components.', '切削、直线运动和机器部件。', 'कटिंग, लीनियर मोशन और मशीन कंपोनेंट।', 'قطع وحركة خطية ومكوّنات آلات.'],
    ['Neumática, sensores y actuación para manejo de materiales.', 'Pneumatics, sensors, and actuation for material handling.', '用于物料搬运的气动、传感器和执行机构。', 'मटेरियल हैंडलिंग के लिए न्यूमैटिक्स, सेंसर और एक्ट्यूएशन।', 'أنظمة هوائية ومستشعرات وتشغيل لمناولة المواد.'],
    ['Automotriz', 'Automotive', '汽车行业', 'ऑटोमोटिव', 'السيارات'],
    ['Componentes para automatización y celdas de alta exigencia.', 'Components for automation and demanding production cells.', '用于自动化和高要求生产单元的部件。', 'ऑटोमेशन और उच्च-प्रदर्शन सेल के लिए कंपोनेंट।', 'مكوّنات للأتمتة وخلايا الإنتاج عالية المتطلبات.'],
    ['Refrigeración industrial', 'Industrial refrigeration', '工业制冷', 'औद्योगिक रेफ्रिजरेशन', 'التبريد الصناعي'],
    ['Equipos IQF, control y componentes para cadena de frío.', 'IQF equipment, controls, and cold-chain components.', 'IQF 设备、控制系统和冷链部件。', 'IQF उपकरण, नियंत्रण और कोल्ड-चेन कंपोनेंट।', 'معدات IQF وتحكم ومكوّنات لسلسلة التبريد.'],
    ['Maquinados / CNC', 'Machining / CNC', '机械加工 / CNC', 'मशीनिंग / CNC', 'تشغيل / CNC'],
    ['Insertos, portaherramientas y movimiento de precisión.', 'Inserts, toolholders, and precision motion.', '刀片、刀柄和精密运动。', 'इन्सर्ट, टूलहोल्डर और प्रिसीजन मोशन।', 'لقم وحوامل أدوات وحركة دقيقة.'],
    ['Mantenimiento industrial', 'Industrial maintenance', '工业维护', 'औद्योगिक रखरखाव', 'الصيانة الصناعية'],
    ['Identificación y suministro de piezas de desgaste.', 'Identification and supply of wear parts.', '易损件的识别与供应。', 'घिसने वाले पार्ट्स की पहचान और आपूर्ति।', 'التعرّف على قطع التآكل وتوريدها.'],
    ['Conocer cómo atendemos cada sector →', 'See how we support each sector →', '了解我们如何服务各行业 →', 'देखें हम हर क्षेत्र को कैसे सहायता देते हैं →', 'تعرف على كيفية خدمة كل قطاع ←'],
    ['Elige el apoyo necesario. La compatibilidad y disponibilidad se confirman antes de cotizar.', 'Choose the support you need. Compatibility and availability are confirmed before quoting.', '选择所需支持。兼容性和供货情况将在报价前确认。', 'आवश्यक सहायता चुनें। कोटेशन से पहले संगतता और उपलब्धता की पुष्टि होती है।', 'اختر الدعم المطلوب. يتم تأكيد التوافق والتوفر قبل تقديم السعر.'],
    ['Identificación y cotización', 'Identification and quoting', '识别与询价', 'पहचान और कोटेशन', 'التعرّف والتسعير'],
    ['Comparte foto, placa, marca o número de parte para iniciar la revisión.', 'Share a photo, nameplate, brand, or part number to start the review.', '提供照片、铭牌、品牌或零件编号以开始审核。', 'समीक्षा शुरू करने के लिए फोटो, नेमप्लेट, ब्रांड या पार्ट नंबर साझा करें।', 'شارك صورة أو لوحة بيانات أو علامة أو رقم قطعة لبدء المراجعة.'],
    ['Iniciar solicitud', 'Start request', '开始请求', 'अनुरोध शुरू करें', 'بدء الطلب'],
    ['Alternativas y compatibilidad', 'Alternatives and compatibility', '替代方案与兼容性', 'विकल्प और संगतता', 'البدائل والتوافق'],
    ['Revisamos medidas, conexión, montaje, aplicación y condiciones de trabajo.', 'We review dimensions, connection, mounting, application, and operating conditions.', '我们审核尺寸、连接、安装、应用和工作条件。', 'हम माप, कनेक्शन, माउंटिंग, उपयोग और कार्य स्थितियों की समीक्षा करते हैं।', 'نراجع المقاسات والتوصيل والتركيب والتطبيق وظروف التشغيل.'],
    ['Revisar alternativa', 'Review alternative', '审核替代方案', 'विकल्प की समीक्षा करें', 'مراجعة البديل'],
    ['Suministro de refacciones', 'Spare parts supply', '备件供应', 'स्पेयर पार्ट्स की आपूर्ति', 'توريد قطع الغيار'],
    ['Concentra productos de distintas familias en una sola cesta de solicitud.', 'Combine products from different families in a single quote cart.', '将不同类别的产品集中到一个询价清单中。', 'अलग-अलग श्रेणियों के उत्पाद एक ही कोटेशन कार्ट में जोड़ें।', 'اجمع منتجات من عائلات مختلفة في سلة طلب واحدة.'],
    ['Armar cesta', 'Build cart', '建立清单', 'कार्ट बनाएँ', 'إعداد السلة'],
    ['Entrega y seguimiento', 'Delivery and follow-up', '交付与跟进', 'डिलीवरी और फॉलो-अप', 'التسليم والمتابعة'],
    ['Un asesor confirma disponibilidad, entrega aplicable y seguimiento comercial.', 'An advisor confirms availability, applicable delivery, and commercial follow-up.', '顾问将确认供货情况、适用的交付方式和商务跟进。', 'सलाहकार उपलब्धता, लागू डिलीवरी और व्यावसायिक फॉलो-अप की पुष्टि करता है।', 'يؤكد المستشار التوفر والتسليم المناسب والمتابعة التجارية.'],
    ['Ver proceso de atención →', 'View support process →', '查看服务流程 →', 'सहायता प्रक्रिया देखें →', 'عرض عملية الخدمة ←'],
    ['Sensores industriales, presión, comunicación y soluciones Industria 4.0.', 'Industrial sensors, pressure, communication, and Industry 4.0 solutions.', '工业传感器、压力、通信和工业 4.0 解决方案。', 'औद्योगिक सेंसर, दबाव, संचार और इंडस्ट्री 4.0 समाधान।', 'مستشعرات صناعية وضغط واتصالات وحلول الصناعة 4.0.'],
    ['Guías, husillos de bolas, actuadores y sistemas multieje de precisión.', 'Precision guides, ball screws, actuators, and multi-axis systems.', '精密导轨、滚珠丝杠、执行器和多轴系统。', 'प्रिसीजन गाइड, बॉल स्क्रू, एक्ट्यूएटर और मल्टी-एक्सिस सिस्टम।', 'أدلة ولولبيات كروية ومشغلات وأنظمة متعددة المحاور عالية الدقة.'],
    ['Cilindros, válvulas, grippers y tratamiento de aire para automatización.', 'Cylinders, valves, grippers, and air treatment for automation.', '用于自动化的气缸、阀门、夹爪和空气处理设备。', 'ऑटोमेशन के लिए सिलेंडर, वाल्व, ग्रिपर और एयर ट्रीटमेंट।', 'أسطوانات وصمامات وقوابض ومعالجة هواء للأتمتة.'],
    ['Bombas, válvulas, cilindros y unidades de potencia hidráulica.', 'Pumps, valves, cylinders, and hydraulic power units.', '泵、阀门、气缸和液压动力单元。', 'पंप, वाल्व, सिलेंडर और हाइड्रोलिक पावर यूनिट।', 'مضخات وصمامات وأسطوانات ووحدات قدرة هيدروليكية.'],
    ['Sensores · visión · control', 'Sensors · vision · control', '传感器 · 视觉 · 控制', 'सेंसर · विज़न · नियंत्रण', 'مستشعرات · رؤية · تحكم'],
    ['Fotoeléctricos, RFID, visión artificial y controladores PLC.', 'Photoelectric sensors, RFID, machine vision, and PLC controllers.', '光电传感器、RFID、机器视觉和 PLC 控制器。', 'फोटोइलेक्ट्रिक सेंसर, RFID, मशीन विज़न और PLC कंट्रोलर।', 'مستشعرات كهروضوئية وRFID ورؤية آلية ووحدات تحكم PLC.'],
    ['Variadores, servos, HMI y motores industriales de alto desempeño.', 'Drives, servos, HMI, and high-performance industrial motors.', '变频器、伺服、HMI 和高性能工业电机。', 'ड्राइव, सर्वो, HMI और उच्च-प्रदर्शन औद्योगिक मोटर।', 'مغيرات سرعة وسيرفو وHMI ومحركات صناعية عالية الأداء.'],
    ['Interfaces hombre-máquina para supervisión y control de procesos.', 'Human-machine interfaces for process monitoring and control.', '用于过程监控和控制的人机界面。', 'प्रक्रिया निगरानी और नियंत्रण के लिए ह्यूमन-मशीन इंटरफेस।', 'واجهات إنسان-آلة لمراقبة العمليات والتحكم فيها.'],
    ['Congelación industrial IQF, túneles y soluciones para alimentos.', 'Industrial IQF freezing, tunnels, and food solutions.', '工业 IQF 冷冻、隧道及食品解决方案。', 'औद्योगिक IQF फ्रीजिंग, टनल और खाद्य समाधान।', 'تجميد صناعي IQF وأنفاق وحلول للأغذية.'],
    ['Componentes industriales para automatización y mantenimiento.', 'Industrial components for automation and maintenance.', '用于自动化和维护的工业部件。', 'ऑटोमेशन और रखरखाव के लिए औद्योगिक कंपोनेंट।', 'مكوّنات صناعية للأتمتة والصيانة.'],
    ['Marcas referenciales. KDL no afirma distribución exclusiva. Te ayudamos a conseguir el componente o una alternativa compatible.', 'Reference brands. KDL does not claim exclusive distribution. We help you source the component or a compatible alternative.', '品牌仅供参考。KDL 不声明独家经销权。我们帮助您采购部件或兼容替代方案。', 'ब्रांड संदर्भ के लिए हैं। KDL विशेष वितरण का दावा नहीं करता। हम कंपोनेंट या संगत विकल्प उपलब्ध कराने में मदद करते हैं।', 'العلامات للمرجعية. لا تدّعي KDL التوزيع الحصري. نساعدك في توفير المكوّن أو بديل متوافق.'],
    ['Solicitar disponibilidad', 'Request availability', '查询供货情况', 'उपलब्धता पूछें', 'طلب التوفر'],
    ['PDF · descarga', 'PDF · download', 'PDF · 下载', 'PDF · डाउनलोड', 'PDF · تنزيل'],
    ['PLC, HMI, sensores, variadores, servos y comunicación industrial.', 'PLC, HMI, sensors, drives, servos, and industrial communication.', 'PLC、HMI、传感器、变频器、伺服和工业通信。', 'PLC, HMI, सेंसर, ड्राइव, सर्वो और औद्योगिक संचार।', 'PLC وHMI ومستشعرات ومغيرات سرعة وسيرفو واتصالات صناعية.'],
    ['© 2026 KDL · Refacciones y Distribuciones KDL · Monterrey, N.L. ·', '© 2026 KDL · Refacciones y Distribuciones KDL · Monterrey, N.L. ·', '© 2026 KDL · Refacciones y Distribuciones KDL · 墨西哥蒙特雷 ·', '© 2026 KDL · Refacciones y Distribuciones KDL · मॉन्टेरी, N.L. ·', '© 2026 KDL · Refacciones y Distribuciones KDL · مونتيري، نويفو ليون ·'],
    ['No. Puedes enviarnos foto de la placa, medidas, marca, modelo o describir la aplicación. Con eso te ayudamos a identificar el componente o una alternativa compatible.', 'No. You can send a nameplate photo, dimensions, brand, model, or a description of the application. We use that information to help identify the component or a compatible alternative.', '不需要。您可以发送铭牌照片、尺寸、品牌、型号，或描述应用。我们将利用这些信息帮助识别部件或兼容替代方案。', 'नहीं। आप नेमप्लेट की फोटो, माप, ब्रांड, मॉडल या उपयोग का विवरण भेज सकते हैं। इससे हम कंपोनेंट या संगत विकल्प पहचानने में मदद करते हैं।', 'لا. يمكنك إرسال صورة لوحة البيانات أو المقاسات أو العلامة أو الطراز أو وصف التطبيق. نستخدم هذه المعلومات للمساعدة في التعرّف على المكوّن أو بديل متوافق.'],
    ['Sí. Validamos opciones compatibles según medidas, aplicación y condiciones de trabajo cuando el modelo original ya no está disponible.', 'Yes. When the original model is no longer available, we validate compatible options based on dimensions, application, and operating conditions.', '是的。当原型号不再供应时，我们会根据尺寸、应用和工作条件验证兼容选项。', 'हाँ। मूल मॉडल उपलब्ध न होने पर हम माप, उपयोग और कार्य स्थितियों के आधार पर संगत विकल्प सत्यापित करते हैं।', 'نعم. عندما لا يعود الطراز الأصلي متاحًا، نتحقق من الخيارات المتوافقة وفق المقاسات والتطبيق وظروف التشغيل.'],
    ['Por WhatsApp o correo, según prefieras. Un asesor técnico da seguimiento a tu solicitud.', 'By WhatsApp or email, whichever you prefer. A technical advisor follows up on your request.', '可通过 WhatsApp 或电子邮件接收，由您选择。技术顾问将跟进您的请求。', 'आपकी पसंद के अनुसार WhatsApp या ईमेल से। तकनीकी सलाहकार आपके अनुरोध का फॉलो-अप करेगा।', 'عبر واتساب أو البريد الإلكتروني حسب تفضيلك. يتابع مستشار فني طلبك.'],
    ['Sí. Atendemos a jefes de mantenimiento, compradores, gerentes de planta y talleres. Puedes armar una lista de refacciones y enviarla completa.', 'Yes. We support maintenance managers, buyers, plant managers, and workshops. You can build a spare-parts list and submit it as one request.', '是的。我们服务维护主管、采购人员、工厂经理和维修车间。您可以建立备件清单并一次性提交。', 'हाँ। हम रखरखाव प्रबंधकों, खरीदारों, प्लांट प्रबंधकों और वर्कशॉप की सहायता करते हैं। आप स्पेयर पार्ट्स की सूची बनाकर एक साथ भेज सकते हैं।', 'نعم. نخدم مسؤولي الصيانة والمشترين ومديري المصانع والورش. يمكنك إعداد قائمة بقطع الغيار وإرسالها كطلب واحد.'],
    ['Protección de datos personales', 'Personal data protection', '个人数据保护', 'व्यक्तिगत डेटा संरक्षण', 'حماية البيانات الشخصية'],
    ['Información sobre el uso de los datos que compartes al contactar, solicitar identificación técnica o pedir una cotización a KDL.', 'Information about how the data you share is used when you contact KDL, request technical identification, or ask for a quote.', '关于您联系 KDL、请求技术识别或询价时所提供数据的使用说明。', 'KDL से संपर्क करने, तकनीकी पहचान मांगने या कोटेशन लेने पर साझा किए गए डेटा के उपयोग की जानकारी।', 'معلومات حول استخدام البيانات التي تشاركها عند التواصل مع KDL أو طلب التعرّف الفني أو طلب عرض سعر.'],
    [', comercialmente identificada como', ', commercially identified as', '，商业名称为', ', जिसका व्यावसायिक नाम है', '، والمعروفة تجاريًا باسم'],
    [', es responsable del tratamiento de los datos personales recabados mediante este sitio y sus canales de contacto.', ', is responsible for processing the personal data collected through this site and its contact channels.', '，负责处理通过本网站及其联系渠道收集的个人数据。', ', इस साइट और इसके संपर्क चैनलों के माध्यम से एकत्र व्यक्तिगत डेटा के प्रसंस्करण के लिए उत्तरदायी है।', '، مسؤولة عن معالجة البيانات الشخصية التي يتم جمعها عبر هذا الموقع وقنوات التواصل الخاصة به.'],
    ['Dependiendo del medio y de la solicitud, podemos recibir:', 'Depending on the channel and request, we may receive:', '根据渠道和请求，我们可能会收到：', 'माध्यम और अनुरोध के अनुसार, हमें यह जानकारी मिल सकती है:', 'بحسب القناة والطلب، قد نتلقى:'],
    ['Nombre, empresa, teléfono, correo electrónico, ciudad o planta.', 'Name, company, telephone number, email address, city, or plant.', '姓名、公司、电话号码、电子邮件、城市或工厂。', 'नाम, कंपनी, फोन, ईमेल, शहर या प्लांट।', 'الاسم والشركة والهاتف والبريد الإلكتروني والمدينة أو المصنع.'],
    ['Información de la solicitud: producto, categoría, marca, número de parte, cantidad, aplicación, urgencia, notas y estado de la máquina.', 'Request information: product, category, brand, part number, quantity, application, urgency, notes, and machine status.', '请求信息：产品、类别、品牌、零件编号、数量、应用、紧急程度、备注和机器状态。', 'अनुरोध की जानकारी: उत्पाद, श्रेणी, ब्रांड, पार्ट नंबर, मात्रा, उपयोग, तात्कालिकता, नोट्स और मशीन की स्थिति।', 'معلومات الطلب: المنتج والفئة والعلامة ورقم القطعة والكمية والتطبيق والاستعجال والملاحظات وحالة الآلة.'],
    ['Fotografías o archivos técnicos que compartas voluntariamente para identificar un componente.', 'Photographs or technical files that you voluntarily share to identify a component.', '您为识别部件而自愿提供的照片或技术文件。', 'किसी कंपोनेंट की पहचान के लिए स्वेच्छा से साझा की गई फोटो या तकनीकी फाइलें।', 'الصور أو الملفات الفنية التي تشاركها طوعًا للتعرّف على مكوّن.'],
    ['Datos técnicos de navegación y eventos básicos de uso cuando las herramientas de medición del sitio estén habilitadas.', 'Technical browsing data and basic usage events when the site measurement tools are enabled.', '启用网站测量工具时的技术浏览数据和基本使用事件。', 'साइट मापन टूल सक्रिय होने पर तकनीकी ब्राउज़िंग डेटा और बुनियादी उपयोग घटनाएँ।', 'بيانات التصفح الفنية وأحداث الاستخدام الأساسية عند تفعيل أدوات قياس الموقع.'],
    ['KDL no solicita datos personales sensibles en los formularios generales de contacto y cotización. Evita incluir información personal innecesaria en fotografías, placas o comentarios.', 'KDL does not request sensitive personal data in general contact and quote forms. Avoid including unnecessary personal information in photographs, nameplates, or comments.', 'KDL 不会在一般联系和询价表单中要求敏感个人数据。请避免在照片、铭牌或备注中包含不必要的个人信息。', 'KDL सामान्य संपर्क और कोटेशन फॉर्म में संवेदनशील व्यक्तिगत डेटा नहीं मांगता। फोटो, नेमप्लेट या टिप्पणियों में अनावश्यक व्यक्तिगत जानकारी न दें।', 'لا تطلب KDL بيانات شخصية حساسة في نماذج التواصل والتسعير العامة. تجنب تضمين معلومات شخصية غير ضرورية في الصور أو لوحات البيانات أو التعليقات.'],
    ['Responder solicitudes de contacto, identificación técnica, documentación y compatibilidad.', 'Respond to contact, technical identification, documentation, and compatibility requests.', '回复联系、技术识别、文档和兼容性请求。', 'संपर्क, तकनीकी पहचान, दस्तावेज़ और संगतता अनुरोधों का जवाब देना।', 'الرد على طلبات التواصل والتعرّف الفني والوثائق والتوافق.'],
    ['Preparar, administrar y dar seguimiento a solicitudes de cotización.', 'Prepare, manage, and follow up on quote requests.', '准备、管理和跟进询价请求。', 'कोटेशन अनुरोध तैयार करना, प्रबंधित करना और उनका फॉलो-अप करना।', 'إعداد طلبات التسعير وإدارتها ومتابعتها.'],
    ['Contactarte por teléfono, WhatsApp o correo electrónico respecto de tu solicitud.', 'Contact you by telephone, WhatsApp, or email regarding your request.', '就您的请求通过电话、WhatsApp 或电子邮件与您联系。', 'आपके अनुरोध के संबंध में फोन, WhatsApp या ईमेल से संपर्क करना।', 'التواصل معك هاتفيًا أو عبر واتساب أو البريد الإلكتروني بشأن طلبك.'],
    ['Generar folios, conservar trazabilidad de la atención y prevenir solicitudes duplicadas.', 'Generate reference numbers, preserve service traceability, and prevent duplicate requests.', '生成编号、保留服务可追溯性并防止重复请求。', 'फोलियो नंबर बनाना, सेवा की ट्रेसबिलिटी बनाए रखना और डुप्लिकेट अनुरोध रोकना।', 'إنشاء أرقام مرجعية وحفظ تتبع الخدمة ومنع الطلبات المكررة.'],
    ['Cumplir obligaciones comerciales, contractuales, fiscales o legales cuando resulten aplicables.', 'Comply with applicable commercial, contractual, tax, or legal obligations.', '履行适用的商业、合同、税务或法律义务。', 'लागू व्यावसायिक, संविदात्मक, कर या कानूनी दायित्वों का पालन करना।', 'الوفاء بالالتزامات التجارية أو التعاقدية أو الضريبية أو القانونية عند انطباقها.'],
    ['Proteger la seguridad y el funcionamiento del sitio.', 'Protect the security and operation of the site.', '保护网站的安全和运行。', 'साइट की सुरक्षा और संचालन की रक्षा करना।', 'حماية أمن الموقع وتشغيله.'],
    ['KDL podrá utilizar datos de contacto para encuestas de servicio o comunicaciones relacionadas con productos y servicios industriales. Puedes oponerte a estas finalidades escribiendo a', 'KDL may use contact information for service surveys or communications related to industrial products and services. You may object to these purposes by writing to', 'KDL 可能会将联系信息用于服务调查或与工业产品和服务相关的通信。您可以写信至以下地址反对这些用途：', 'KDL संपर्क जानकारी का उपयोग सेवा सर्वेक्षण या औद्योगिक उत्पादों और सेवाओं से संबंधित संचार के लिए कर सकता है। आप इस उद्देश्य का विरोध इस पते पर लिखकर कर सकते हैं:', 'قد تستخدم KDL بيانات التواصل لاستبيانات الخدمة أو الاتصالات المتعلقة بالمنتجات والخدمات الصناعية. يمكنك الاعتراض على هذه الأغراض بالكتابة إلى'],
    ['. Negarte a finalidades secundarias no afecta la atención de una solicitud vigente.', '. Refusing secondary purposes does not affect the handling of an active request.', '。拒绝次要用途不会影响当前请求的处理。', '। द्वितीयक उद्देश्यों से इनकार करने पर वर्तमान अनुरोध की सेवा प्रभावित नहीं होती।', '. لا يؤثر رفض الأغراض الثانوية في معالجة طلب قائم.'],
    ['Cuando eliges continuar por WhatsApp, correo u otro canal externo, la información se transmite mediante el proveedor correspondiente y también queda sujeta a sus términos y políticas. KDL puede utilizar proveedores tecnológicos indispensables para alojamiento, mensajería, correo, respaldo o administración de solicitudes, quienes deberán tratar los datos por cuenta de KDL y conforme a instrucciones aplicables.', 'When you choose to continue through WhatsApp, email, or another external channel, the information is transmitted through the corresponding provider and is also subject to its terms and policies. KDL may use essential technology providers for hosting, messaging, email, backups, or request management; these providers must process data on behalf of KDL and according to applicable instructions.', '当您选择通过 WhatsApp、电子邮件或其他外部渠道继续时，信息将通过相应提供商传输，并受其条款和政策约束。KDL 可能会使用托管、消息、电子邮件、备份或请求管理所必需的技术提供商；这些提供商必须代表 KDL 并按照适用指示处理数据。', 'जब आप WhatsApp, ईमेल या किसी अन्य बाहरी चैनल से आगे बढ़ते हैं, तो जानकारी संबंधित प्रदाता के माध्यम से भेजी जाती है और उसके नियमों व नीतियों के अधीन होती है। KDL होस्टिंग, संदेश, ईमेल, बैकअप या अनुरोध प्रबंधन के लिए आवश्यक तकनीकी प्रदाताओं का उपयोग कर सकता है; उन्हें KDL की ओर से और लागू निर्देशों के अनुसार डेटा संसाधित करना होगा।', 'عندما تختار المتابعة عبر واتساب أو البريد الإلكتروني أو قناة خارجية أخرى، تُنقل المعلومات من خلال المزود المعني وتخضع أيضًا لشروطه وسياساته. قد تستخدم KDL مزودي تقنية ضروريين للاستضافة أو الرسائل أو البريد أو النسخ الاحتياطي أو إدارة الطلبات، وعليهم معالجة البيانات نيابة عن KDL ووفق التعليمات المطبقة.'],
    ['KDL no vende datos personales. Si llegara a requerirse una transferencia que necesite consentimiento, éste se solicitará previamente, salvo las excepciones previstas por la legislación aplicable.', 'KDL does not sell personal data. If a transfer requiring consent becomes necessary, consent will be requested in advance, except for exceptions provided by applicable law.', 'KDL 不出售个人数据。如果需要进行须取得同意的数据传输，将事先征得同意，但适用法律规定的例外情况除外。', 'KDL व्यक्तिगत डेटा नहीं बेचता। यदि सहमति आवश्यक वाला हस्तांतरण जरूरी हो, तो लागू कानून में दिए अपवादों को छोड़कर पहले सहमति मांगी जाएगी।', 'لا تبيع KDL البيانات الشخصية. إذا لزم نقل يتطلب موافقة، فستُطلب الموافقة مسبقًا، باستثناء الحالات التي يجيزها القانون المطبق.'],
    ['Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos, revocar el consentimiento o limitar su uso. Envía un correo con el asunto', 'You may request access, correction, cancellation, or objection to the processing of your data, revoke consent, or limit its use. Send an email with the subject', '您可以请求访问、更正、删除或反对处理您的数据，撤销同意或限制其使用。请发送主题为以下内容的电子邮件：', 'आप अपने डेटा तक पहुँच, सुधार, रद्दीकरण या प्रसंस्करण पर आपत्ति, सहमति वापस लेने या उपयोग सीमित करने का अनुरोध कर सकते हैं। इस विषय के साथ ईमेल भेजें:', 'يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو إلغائها أو الاعتراض على معالجتها أو سحب الموافقة أو تقييد استخدامها. أرسل بريدًا بعنوان'],
    ['“Derechos ARCO”', '“ARCO Rights”', '“ARCO 权利”', '“ARCO अधिकार”', '“حقوق ARCO”'],
    ['e incluye:', 'and include:', '并包括：', 'और इसमें शामिल करें:', 'ويتضمن:'],
    ['Tu nombre y un medio para comunicarte contigo.', 'Your name and a way to contact you.', '您的姓名和联系方式。', 'आपका नाम और आपसे संपर्क करने का माध्यम।', 'اسمك ووسيلة للتواصل معك.'],
    ['La descripción clara de los datos y del derecho que deseas ejercer.', 'A clear description of the data and the right you wish to exercise.', '对相关数据以及您希望行使的权利进行清楚说明。', 'डेटा और जिस अधिकार का प्रयोग करना चाहते हैं उसका स्पष्ट विवरण।', 'وصف واضح للبيانات والحق الذي ترغب في ممارسته.'],
    ['Información que permita localizar la solicitud o relación con KDL.', 'Information that allows the request or relationship with KDL to be located.', '可用于查找请求或与 KDL 关系的信息。', 'अनुरोध या KDL के साथ संबंध खोजने में सहायक जानकारी।', 'معلومات تسمح بتحديد الطلب أو العلاقة مع KDL.'],
    ['Los elementos necesarios para acreditar tu identidad o representación.', 'The information necessary to verify your identity or representation.', '验证您的身份或代理关系所需的信息。', 'आपकी पहचान या प्रतिनिधित्व सत्यापित करने के लिए आवश्यक जानकारी।', 'العناصر اللازمة لإثبات هويتك أو صفتك التمثيلية.'],
    ['No envíes documentos de identidad sensibles en el primer correo. KDL indicará, cuando sea necesario, el medio adecuado para acreditar identidad. La solicitud será atendida dentro de los plazos previstos por la legislación aplicable.', 'Do not send sensitive identity documents in the first email. When necessary, KDL will indicate the appropriate method for verifying identity. The request will be handled within the periods established by applicable law.', '请勿在第一封邮件中发送敏感身份证件。必要时，KDL 将说明适当的身份验证方式。请求将在适用法律规定的期限内处理。', 'पहले ईमेल में संवेदनशील पहचान दस्तावेज़ न भेजें। आवश्यकता होने पर KDL पहचान सत्यापित करने का उचित माध्यम बताएगा। अनुरोध लागू कानून द्वारा निर्धारित समय सीमा में संभाला जाएगा।', 'لا ترسل وثائق هوية حساسة في الرسالة الأولى. ستوضح KDL عند الحاجة الوسيلة المناسبة لإثبات الهوية. سيُعالج الطلب ضمن المدد التي يحددها القانون المطبق.'],
    ['El sitio puede utilizar almacenamiento local o de sesión para conservar temporalmente la cesta, borradores, preferencias, folios e información técnica de prevención de duplicados. Puedes eliminar estos datos desde la configuración del navegador; al hacerlo podrían perderse borradores o productos guardados.', 'The site may use local or session storage to temporarily retain the cart, drafts, preferences, reference numbers, and technical duplicate-prevention information. You can delete this data from your browser settings; doing so may remove saved drafts or products.', '本网站可能使用本地或会话存储，临时保存清单、草稿、偏好设置、编号和防止重复的技术信息。您可以从浏览器设置中删除这些数据；这样做可能会丢失已保存的草稿或产品。', 'साइट कार्ट, ड्राफ्ट, प्राथमिकताएँ, फोलियो नंबर और डुप्लिकेट रोकथाम की तकनीकी जानकारी अस्थायी रूप से रखने के लिए लोकल या सेशन स्टोरेज का उपयोग कर सकती है। आप ब्राउज़र सेटिंग से यह डेटा हटा सकते हैं; ऐसा करने पर सहेजे गए ड्राफ्ट या उत्पाद खो सकते हैं।', 'قد يستخدم الموقع التخزين المحلي أو تخزين الجلسة للاحتفاظ مؤقتًا بالسلة والمسودات والتفضيلات والأرقام المرجعية ومعلومات منع التكرار. يمكنك حذف هذه البيانات من إعدادات المتصفح؛ وقد يؤدي ذلك إلى فقدان المسودات أو المنتجات المحفوظة.'],
    ['Los datos se conservarán durante el tiempo necesario para atender la solicitud, mantener la relación comercial y cumplir obligaciones legales o de defensa de derechos. KDL aplica medidas administrativas y técnicas razonables, considerando la naturaleza de la información y los medios utilizados.', 'Data will be retained for the time necessary to handle the request, maintain the commercial relationship, and comply with legal obligations or defend rights. KDL applies reasonable administrative and technical measures considering the nature of the information and the means used.', '数据将在处理请求、维持商业关系以及履行法律义务或维护权利所需的期限内保留。KDL 会根据数据性质和所用方式采取合理的管理和技术措施。', 'डेटा अनुरोध संभालने, व्यावसायिक संबंध बनाए रखने और कानूनी दायित्वों या अधिकारों की रक्षा के लिए आवश्यक समय तक रखा जाएगा। KDL जानकारी की प्रकृति और उपयोग किए गए माध्यमों को देखते हुए उचित प्रशासनिक और तकनीकी उपाय लागू करता है।', 'تُحفظ البيانات للمدة اللازمة لمعالجة الطلب والحفاظ على العلاقة التجارية والوفاء بالالتزامات القانونية أو الدفاع عن الحقوق. تطبق KDL تدابير إدارية وفنية معقولة بالنظر إلى طبيعة المعلومات والوسائل المستخدمة.'],
    ['Las modificaciones relevantes se publicarán en esta misma página indicando la fecha de actualización. Cuando la ley lo requiera, se solicitará nuevamente el consentimiento correspondiente.', 'Material changes will be published on this page with the update date. When required by law, the corresponding consent will be requested again.', '重大变更将在本页面发布并注明更新日期。法律要求时，将重新征得相应同意。', 'महत्वपूर्ण बदलाव इसी पेज पर अपडेट तिथि के साथ प्रकाशित किए जाएँगे। कानून के अनुसार आवश्यक होने पर संबंधित सहमति फिर मांगी जाएगी।', 'ستُنشر التعديلات المهمة في هذه الصفحة مع بيان تاريخ التحديث. وعندما يطلب القانون ذلك، ستُطلب الموافقة المناسبة مجددًا.'],
    ['Última actualización:', 'Last updated:', '最后更新：', 'अंतिम अपडेट:', 'آخر تحديث:'],
    ['29 de julio de 2026. Este aviso describe el tratamiento actualmente previsto para el sitio; debe revisarse nuevamente si se incorporan pagos, facturación en línea, nuevas plataformas CRM o campañas publicitarias.', 'July 29, 2026. This notice describes the processing currently planned for the site; it must be reviewed again if payments, online invoicing, new CRM platforms, or advertising campaigns are added.', '2026 年 7 月 29 日。本声明描述了网站当前计划的数据处理方式；如果增加支付、在线开票、新的 CRM 平台或广告活动，则必须重新审核。', '29 जुलाई 2026। यह सूचना साइट के लिए वर्तमान में नियोजित डेटा प्रसंस्करण का वर्णन करती है; भुगतान, ऑनलाइन बिलिंग, नए CRM प्लेटफॉर्म या विज्ञापन अभियान जोड़े जाने पर इसकी फिर समीक्षा करनी होगी।', '29 يوليو 2026. يصف هذا الإشعار المعالجة المخطط لها حاليًا للموقع؛ ويجب مراجعته مجددًا إذا أضيفت مدفوعات أو فواتير إلكترونية أو منصات CRM جديدة أو حملات إعلانية.'],
    ['Catalogo KDL', 'KDL catalog', 'KDL 目录', 'KDL कैटलॉग', 'كتالوج KDL'],
    ['Cotizar esta categoria', 'Request a quote for this category', '为此类别询价', 'इस श्रेणी का कोटेशन लें', 'اطلب سعرًا لهذه الفئة'],
    ['Ver catalogo interactivo', 'View interactive catalog', '查看交互式目录', 'इंटरैक्टिव कैटलॉग देखें', 'عرض الكتالوج التفاعلي'],
    ['Ver ficha interactiva', 'View interactive data sheet', '查看交互式数据表', 'इंटरैक्टिव डेटा शीट देखें', 'عرض ورقة البيانات التفاعلية'],
    ['Datos para cotizar', 'Quote requirements', '询价所需信息', 'कोटेशन के लिए जानकारी', 'بيانات طلب السعر'],
    ['Diámetro y carrera', 'Diameter and stroke', '直径和行程', 'व्यास और स्ट्रोक', 'القطر والشوط'],
    ['Tipo (ISO, compacto, guiado)', 'Type (ISO, compact, guided)', '类型（ISO、紧凑型、导向型）', 'प्रकार (ISO, कॉम्पैक्ट, गाइडेड)', 'النوع (ISO، مدمج، موجه)'],
    ['Marca / No. de parte', 'Brand / Part number', '品牌 / 零件编号', 'ब्रांड / पार्ट नंबर', 'العلامة / رقم القطعة'],
    ['Presión de trabajo', 'Operating pressure', '工作压力', 'कार्य दबाव', 'ضغط التشغيل'],
    ['Conexión y montaje', 'Connection and mounting', '连接和安装', 'कनेक्शन और माउंटिंग', 'التوصيل والتركيب'],
    ['Aplicaciones', 'Applications', '应用', 'उपयोग', 'التطبيقات'],
    ['Sujeción y manipulación', 'Clamping and handling', '夹持和搬运', 'क्लैम्पिंग और हैंडलिंग', 'التثبيت والمناولة'],
    ['Estaciones de ensamble', 'Assembly stations', '装配工位', 'असेंबली स्टेशन', 'محطات التجميع'],
    ['Automatización de líneas', 'Line automation', '生产线自动化', 'लाइन ऑटोमेशन', 'أتمتة الخطوط'],
    ['Fallas comunes', 'Common faults', '常见故障', 'सामान्य खराबियाँ', 'الأعطال الشائعة'],
    ['Fuga por sellos gastados', 'Leak from worn seals', '密封件磨损导致泄漏', 'घिसे सील से रिसाव', 'تسرب بسبب أختام متآكلة'],
    ['Ciclo lento o sin retorno', 'Slow cycle or no return', '循环缓慢或不回位', 'धीमा साइकिल या वापसी नहीं', 'دورة بطيئة أو دون رجوع'],
    ['Válvula pegada o quemada', 'Stuck or burned valve', '阀门卡住或烧毁', 'अटका या जला वाल्व', 'صمام عالق أو محترق'],
    ['Documentacion', 'Documentation', '文档', 'दस्तावेज़', 'الوثائق'],
    ['Solicita la ficha técnica correspondiente a la marca y modelo exactos.', 'Request the technical data sheet for the exact brand and model.', '索取准确品牌和型号对应的技术数据表。', 'सटीक ब्रांड और मॉडल की तकनीकी डेटा शीट मांगें।', 'اطلب ورقة البيانات الفنية المطابقة للعلامة والطراز المحددين.'],
    ['Solicitar', 'Request', '索取', 'अनुरोध करें', 'طلب'],
    ['¿Cómo se valida una alternativa compatible?', 'How is a compatible alternative validated?', '如何验证兼容替代方案？', 'संगत विकल्प कैसे सत्यापित किया जाता है?', 'كيف يتم التحقق من بديل متوافق؟'],
    ['Se revisan especificaciones críticas, montaje, conexiones, dimensiones, condiciones de trabajo y aplicación. La apariencia no confirma compatibilidad.', 'Critical specifications, mounting, connections, dimensions, operating conditions, and application are reviewed. Appearance alone does not confirm compatibility.', '我们会审核关键规格、安装、连接、尺寸、工作条件和应用。外观相似不能确认兼容性。', 'महत्वपूर्ण विनिर्देश, माउंटिंग, कनेक्शन, माप, कार्य स्थितियाँ और उपयोग की समीक्षा की जाती है। केवल दिखावट संगतता की पुष्टि नहीं करती।', 'تتم مراجعة المواصفات الحرجة والتركيب والتوصيلات والأبعاد وظروف التشغيل والتطبيق. لا يؤكد التشابه الشكلي التوافق.'],
    ['Documenta el síntoma, número de parte, condiciones de operación y fotografías seguras de la placa y el montaje para orientar la revisión.', 'Document the symptom, part number, operating conditions, and safe photos of the nameplate and mounting to guide the review.', '记录症状、零件编号、运行条件，并提供铭牌和安装的安全照片，以便审核。', 'समीक्षा में सहायता के लिए लक्षण, पार्ट नंबर, संचालन स्थितियाँ और नेमप्लेट व माउंटिंग की सुरक्षित फोटो दें।', 'وثّق العَرَض ورقم القطعة وظروف التشغيل وصورًا آمنة للوحة البيانات والتركيب لتوجيه المراجعة.'],
    ['¿Puedo solicitar una ficha técnica?', 'Can I request a technical data sheet?', '可以索取技术数据表吗？', 'क्या मैं तकनीकी डेटा शीट मांग सकता हूँ?', 'هل يمكنني طلب ورقة بيانات فنية؟'],
    ['Sí. Indica la marca y el modelo exactos para localizar la ficha técnica oficial correspondiente.', 'Yes. Provide the exact brand and model to locate the corresponding official technical data sheet.', '可以。请提供准确的品牌和型号，以查找相应的官方技术数据表。', 'हाँ। संबंधित आधिकारिक तकनीकी डेटा शीट खोजने के लिए सटीक ब्रांड और मॉडल बताएं।', 'نعم. اذكر العلامة والطراز بدقة للعثور على ورقة البيانات الفنية الرسمية المطابقة.'],
    ['Productos relacionados', 'Related products', '相关产品', 'संबंधित उत्पाद', 'منتجات ذات صلة'],
    ['Ø32–320 mm · carreras hasta 2000 mm', 'Ø32–320 mm · strokes up to 2000 mm', 'Ø32–320 mm · 行程可达 2000 mm', 'Ø32–320 mm · स्ट्रोक 2000 mm तक', 'Ø32–320 مم · شوط حتى 2000 مم'],
    ['Ø8–25 mm · doble efecto', 'Ø8–25 mm · double acting', 'Ø8–25 mm · 双作用', 'Ø8–25 mm · डबल एक्टिंग', 'Ø8–25 مم · مزدوجة الفعل'],
    ['1.5 MPa (15 bar) · simple / doble efecto', '1.5 MPa (15 bar) · single / double acting', '1.5 MPa（15 bar）· 单作用 / 双作用', '1.5 MPa (15 bar) · सिंगल / डबल एक्टिंग', '1.5 MPa (15 بار) · مفردة / مزدوجة الفعل'],
    ['compacto, doble efecto', 'compact, double acting', '紧凑型，双作用', 'कॉम्पैक्ट, डबल एक्टिंग', 'مدمجة، مزدوجة الفعل'],
    ['CM2 Ø20–40 · CJ2 serie 6/10/16', 'CM2 Ø20–40 · CJ2 series 6/10/16', 'CM2 Ø20–40 · CJ2 系列 6/10/16', 'CM2 Ø20–40 · CJ2 सीरीज़ 6/10/16', 'CM2 Ø20–40 · سلسلة CJ2 ‏6/10/16'],
    ['guiados compactos · posición', 'compact guided · positioning', '紧凑导向型 · 定位', 'कॉम्पैक्ट गाइडेड · पोज़िशनिंग', 'موجهة مدمجة · تموضع'],
    ['tamaños 10–200', 'sizes 10–200', '尺寸 10–200', 'आकार 10–200', 'مقاسات 10–200'],
    ['cilindro de doble vástago', 'double-rod cylinder', '双杆气缸', 'डबल-रॉड सिलेंडर', 'أسطوانة مزدوجة القضيب'],
    ['sujeción con giro', 'rotary clamping', '旋转夹紧', 'रोटरी क्लैम्पिंग', 'تثبيت دوار'],
    ['absorbedores de impacto', 'impact absorbers', '冲击吸收器', 'इम्पैक्ट एब्जॉर्बर', 'ممتصات صدمات'],
    ['soporte de eje lineal', 'linear shaft support', '直线轴支撑', 'लीनियर शाफ्ट सपोर्ट', 'دعم عمود خطي'],
    ['tratamiento de aire comprimido', 'compressed-air treatment', '压缩空气处理', 'कंप्रेस्ड एयर ट्रीटमेंट', 'معالجة الهواء المضغوط'],
    ['KDL, Suministros y Servicios Industriales', 'KDL, Industrial Supplies and Services', 'KDL，工业用品与服务', 'KDL, औद्योगिक आपूर्ति और सेवाएँ', 'KDL، المستلزمات والخدمات الصناعية'],
    ['Compromisos de atención KDL', 'KDL service commitments', 'KDL 服务承诺', 'KDL सेवा प्रतिबद्धताएँ', 'التزامات خدمة KDL'],
    ['Formas de iniciar la solicitud', 'Ways to start a request', '发起请求的方式', 'अनुरोध शुरू करने के तरीके', 'طرق بدء الطلب'],
    ['Busca por nombre de producto, referencia o categoría', 'Search by product name, reference, or category', '按产品名称、型号或类别搜索', 'उत्पाद नाम, संदर्भ या श्रेणी से खोजें', 'ابحث باسم المنتج أو المرجع أو الفئة'],
    ['Buscar productos', 'Search products', '搜索产品', 'उत्पाद खोजें', 'البحث عن المنتجات'],
    ['Filtrar por categoría', 'Filter by category', '按类别筛选', 'श्रेणी से फ़िल्टर करें', 'تصفية حسب الفئة'],
    ['Filtrar por marca', 'Filter by brand', '按品牌筛选', 'ब्रांड से फ़िल्टर करें', 'تصفية حسب العلامة'],
    ['Filtrar por tipo', 'Filter by type', '按类型筛选', 'प्रकार से फ़िल्टर करें', 'تصفية حسب النوع'],
    ['Anterior', 'Previous', '上一页', 'पिछला', 'السابق'],
    ['Siguiente', 'Next', '下一页', 'अगला', 'التالي'],
    ['Navegación del pie de página', 'Footer navigation', '页脚导航', 'फुटर नेविगेशन', 'التنقل في تذييل الصفحة'],
    ['Busca por documento, marca, producto o categoría…', 'Search by document, brand, product, or category…', '按文档、品牌、产品或类别搜索…', 'दस्तावेज़, ब्रांड, उत्पाद या श्रेणी से खोजें…', 'ابحث حسب المستند أو العلامة أو المنتج أو الفئة…'],
    ['Buscar documentación técnica', 'Search technical documentation', '搜索技术文档', 'तकनीकी दस्तावेज़ खोजें', 'البحث في الوثائق الفنية'],
    ['Cesta', 'Cart', '清单', 'कार्ट', 'السلة'],
    ['Ej. sensor PNP M12 descontinuado, cilindro Ø63, variador 2 HP…', 'E.g. discontinued M12 PNP sensor, Ø63 cylinder, 2 HP drive…', '例如：停产的 M12 PNP 传感器、Ø63 气缸、2 HP 变频器…', 'उदा. बंद M12 PNP सेंसर, Ø63 सिलेंडर, 2 HP ड्राइव…', 'مثال: مستشعر PNP M12 متوقف، أسطوانة Ø63، مغير سرعة 2 HP…'],
    ['Buscar alternativa compatible', 'Search for a compatible alternative', '搜索兼容替代方案', 'संगत विकल्प खोजें', 'البحث عن بديل متوافق'],
    ['Ej. AirTAC SC 63x200', 'E.g. AirTAC SC 63x200', '例如 AirTAC SC 63x200', 'उदा. AirTAC SC 63x200', 'مثال AirTAC SC 63x200'],
    ['Pieza o número de parte', 'Part or part number', '零件或零件编号', 'पार्ट या पार्ट नंबर', 'القطعة أو رقم القطعة'],
    ['Cantidad de piezas', 'Number of units', '零件数量', 'पीस की संख्या', 'عدد القطع'],
    ['Nombre', 'Name', '姓名', 'नाम', 'الاسم'],
    ['Empresa', 'Company', '公司', 'कंपनी', 'الشركة'],
    ['WhatsApp — (81) 1234 5678', 'WhatsApp — (81) 1234 5678', 'WhatsApp — (81) 1234 5678', 'WhatsApp — (81) 1234 5678', 'واتساب — (81) 1234 5678'],
    ['¿Qué pieza necesitas? Describe la falla o aplicación…', 'What part do you need? Describe the fault or application…', '您需要什么零件？请描述故障或应用…', 'आपको कौन-सा पार्ट चाहिए? खराबी या उपयोग बताएं…', 'ما القطعة التي تحتاجها؟ صف العطل أو التطبيق…'],
    ['Pieza, falla o aplicación', 'Part, fault, or application', '零件、故障或应用', 'पार्ट, खराबी या उपयोग', 'القطعة أو العطل أو التطبيق'],
    ['Contenido de soluciones', 'Solutions content', '解决方案内容', 'समाधान सामग्री', 'محتوى الحلول'],
    ['Catálogo de productos', 'Product catalog', '产品目录', 'उत्पाद कैटलॉग', 'كتالوج المنتجات'],
    ['Documentación técnica para seleccionar con certeza.', 'Technical documentation for confident selection.', '确保选型准确的技术文档。', 'भरोसेमंद चयन के लिए तकनीकी दस्तावेज़।', 'وثائق فنية للاختيار بثقة.'],
    ['Biblioteca técnica', 'Technical library', '技术资料库', 'तकनीकी लाइब्रेरी', 'المكتبة الفنية'],
    ['Catálogos por marca', 'Catalogs by brand', '按品牌分类的目录', 'ब्रांड के अनुसार कैटलॉग', 'كتالوجات حسب العلامة'],
    ['¿Tu pieza está descontinuada? Encuentra una alternativa compatible.', 'Is your part discontinued? Find a compatible alternative.', '您的零件已停产吗？寻找兼容的替代方案。', 'क्या आपका पार्ट बंद हो चुका है? एक संगत विकल्प खोजें।', 'هل تم إيقاف قطعتك؟ اعثر على بديل متوافق.'],
    ['Cómo funciona', 'How it works', '工作原理', 'यह कैसे काम करता है', 'كيف تعمل العملية'],
    ['Calculadora de consumo de aire', 'Air consumption calculator', '耗气量计算器', 'वायु खपत कैलकुलेटर', 'حاسبة استهلاك الهواء'],
    ['Cotiza en un mensaje. Respuesta por asesor técnico.', 'Request a quote in one message. A technical advisor will respond.', '通过一条消息询价。由技术顾问回复。', 'एक संदेश में कोटेशन लें। तकनीकी सलाहकार जवाब देगा।', 'اطلب السعر في رسالة واحدة. يجيبك مستشار فني.'],
    ['Acciones rápidas', 'Quick actions', '快捷操作', 'त्वरित कार्रवाई', 'إجراءات سريعة'],
    ['Solicita disponibilidad', 'Request availability', '查询供货情况', 'उपलब्धता पूछें', 'اطلب التوفر'],
    ['Soluciones, industrias y servicios KDL.', 'KDL solutions, industries, and services.', 'KDL 解决方案、行业与服务。', 'KDL समाधान, उद्योग और सेवाएँ।', 'حلول KDL وقطاعاتها وخدماتها.'],
    ['Soluciones por familia técnica', 'Solutions by technical family', '按技术类别划分的解决方案', 'तकनीकी श्रेणी के अनुसार समाधान', 'حلول حسب العائلة الفنية'],
    ['Aplicaciones por industria', 'Applications by industry', '行业应用', 'उद्योग के अनुसार उपयोग', 'التطبيقات حسب القطاع'],
    ['Servicios de apoyo técnico y comercial', 'Technical and commercial support services', '技术与商务支持服务', 'तकनीकी और व्यावसायिक सहायता सेवाएँ', 'خدمات الدعم الفني والتجاري'],
    ['Aviso de privacidad integral', 'Comprehensive privacy notice', '完整隐私声明', 'समग्र गोपनीयता सूचना', 'إشعار الخصوصية الشامل'],
    ['Responsable', 'Data controller', '负责人', 'उत्तरदायी पक्ष', 'المسؤول'],
    ['Datos que podemos recabar', 'Data we may collect', '我们可能收集的数据', 'हम जो डेटा एकत्र कर सकते हैं', 'البيانات التي قد نجمعها'],
    ['Finalidades necesarias', 'Required purposes', '必要用途', 'आवश्यक उद्देश्य', 'الأغراض الضرورية'],
    ['Finalidades secundarias', 'Secondary purposes', '次要用途', 'द्वितीयक उद्देश्य', 'الأغراض الثانوية'],
    ['Canales externos y encargados', 'External channels and processors', '外部渠道与处理方', 'बाहरी चैनल और प्रोसेसर', 'القنوات الخارجية ومعالجو البيانات'],
    ['Derechos ARCO, revocación y limitación', 'ARCO rights, revocation, and limitation', 'ARCO 权利、撤销与限制', 'ARCO अधिकार, निरसन और सीमा', 'حقوق ARCO والإلغاء والتقييد'],
    ['Almacenamiento local y tecnologías del sitio', 'Local storage and site technologies', '本地存储与网站技术', 'स्थानीय संग्रहण और साइट तकनीकें', 'التخزين المحلي وتقنيات الموقع'],
    ['Conservación y seguridad', 'Retention and security', '保留与安全', 'प्रतिधारण और सुरक्षा', 'الاحتفاظ والأمان'],
    ['Cambios al aviso', 'Changes to this notice', '声明变更', 'सूचना में परिवर्तन', 'التغييرات على الإشعار'],
    ['Lunes a viernes · 8:00 a.m. a 6:00 p.m.', 'Monday to Friday · 8:00 a.m. to 6:00 p.m.', '周一至周五 · 上午 8:00 至下午 6:00', 'सोमवार से शुक्रवार · सुबह 8:00 से शाम 6:00', 'من الاثنين إلى الجمعة · 8:00 صباحًا إلى 6:00 مساءً']
  ];

  var dictionaries = {};
  supported.forEach(function (code, languageIndex) {
    dictionaries[code] = new Map();
    rows.forEach(function (row) { dictionaries[code].set(row[0], row[languageIndex]); });
  });

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function currentLanguage() {
    var stored = '';
    try { stored = localStorage.getItem(STORAGE_KEY) || ''; } catch (error) {}
    return supported.indexOf(stored) >= 0 ? stored : 'es';
  }

  function shouldSkip(node) {
    var parent = node.parentElement;
    if (!parent) return true;
    return !!parent.closest('script,style,noscript,template,[data-kdl-no-translate],.kdl-language');
  }

  var lowerDictionaries = {};
  supported.forEach(function (code, languageIndex) {
    lowerDictionaries[code] = new Map();
    rows.forEach(function (row) { lowerDictionaries[code].set(normalize(row[0]).toLocaleLowerCase('es'), row[languageIndex]); });
  });

  var dynamicTemplates = {
    en: {
      productsOf: function (value) { return 'Products in ' + value; },
      faqAbout: function (value) { return 'Frequently asked questions about ' + value; },
      quoteInfo: function (value) { return 'What information does KDL need to quote ' + value + '?'; },
      fault: function (value) { return 'What should I do if it has ' + value + '?'; },
      count: function (value) { return value + ' products'; },
      description: function (name, spec, category) { return name + ' — ' + spec + '. Part of ' + category + '. KDL helps validate compatibility, availability, and alternatives for industrial maintenance.'; },
      share: function (data) { return 'Share ' + data + '. If you do not have all the information, a photo of the nameplate or part helps start the identification.'; }
    },
    'zh-CN': {
      productsOf: function (value) { return value + '产品'; },
      faqAbout: function (value) { return '关于' + value + '的常见问题'; },
      quoteInfo: function (value) { return 'KDL 为' + value + '询价需要哪些信息？'; },
      fault: function (value) { return '如果出现' + value + '该怎么办？'; },
      count: function (value) { return value + ' 个产品'; },
      description: function (name, spec, category) { return name + ' — ' + spec + '。属于' + category + '。KDL 协助验证工业维护所需的兼容性、供货情况和替代方案。'; },
      share: function (data) { return '请提供' + data + '。如果信息不全，铭牌或零件照片有助于开始识别。'; }
    },
    hi: {
      productsOf: function (value) { return value + ' के उत्पाद'; },
      faqAbout: function (value) { return value + ' के बारे में अक्सर पूछे जाने वाले प्रश्न'; },
      quoteInfo: function (value) { return value + ' का कोटेशन देने के लिए KDL को कौन-सी जानकारी चाहिए?'; },
      fault: function (value) { return 'यदि इसमें ' + value + ' हो तो क्या करें?'; },
      count: function (value) { return value + ' उत्पाद'; },
      description: function (name, spec, category) { return name + ' — ' + spec + '। यह ' + category + ' का भाग है। KDL औद्योगिक रखरखाव के लिए संगतता, उपलब्धता और विकल्प सत्यापित करने में मदद करता है।'; },
      share: function (data) { return data + ' साझा करें। यदि सारी जानकारी उपलब्ध नहीं है, तो नेमप्लेट या पार्ट की फोटो पहचान शुरू करने में मदद करती है।'; }
    },
    ar: {
      productsOf: function (value) { return 'منتجات ' + value; },
      faqAbout: function (value) { return 'الأسئلة الشائعة حول ' + value; },
      quoteInfo: function (value) { return 'ما المعلومات التي تحتاجها KDL لتسعير ' + value + '؟'; },
      fault: function (value) { return 'ماذا أفعل عند وجود ' + value + '؟'; },
      count: function (value) { return value + ' منتجًا'; },
      description: function (name, spec, category) { return name + ' — ' + spec + '. جزء من ' + category + '. تساعد KDL في التحقق من التوافق والتوفر والبدائل للصيانة الصناعية.'; },
      share: function (data) { return 'شارك ' + data + '. إذا لم تتوفر جميع المعلومات، فتساعد صورة لوحة البيانات أو القطعة على بدء التعرّف.'; }
    }
  };

  function translateFragment(value, code) {
    var clean = normalize(value);
    var exact = dictionaries[code].get(clean) || lowerDictionaries[code].get(clean.toLocaleLowerCase('es'));
    if (exact) return exact;
    return clean.split(', ').map(function (part) {
      return dictionaries[code].get(part) || lowerDictionaries[code].get(part.toLocaleLowerCase('es')) || part;
    }).join(code === 'zh-CN' ? '、' : ', ');
  }

  function translateDynamic(value, code) {
    var template = dynamicTemplates[code];
    if (!template) return '';
    var match;
    if ((match = value.match(/^Productos de (.+)$/))) return template.productsOf(translateFragment(match[1], code));
    if ((match = value.match(/^Preguntas frecuentes sobre (.+)$/))) return template.faqAbout(translateFragment(match[1], code));
    if ((match = value.match(/^¿Qué información necesita KDL para cotizar (.+)\?$/))) return template.quoteInfo(translateFragment(match[1], code));
    if ((match = value.match(/^¿Qué hago si presenta (.+)\?$/))) return template.fault(translateFragment(match[1], code));
    if ((match = value.match(/^(\d+) productos$/))) return template.count(match[1]);
    if ((match = value.match(/^(.+?) - (.+?)\. Producto de (.+?)\. KDL ayuda a validar compatibilidad, disponibilidad y alternativas para mantenimiento industrial\.$/))) {
      return template.description(translateFragment(match[1], code), translateFragment(match[2], code), translateFragment(match[3], code));
    }
    if ((match = value.match(/^Comparte (.+)\. Si no tienes todos los datos, una foto de la placa o de la pieza ayuda a comenzar la identificación\.$/))) {
      return template.share(translateFragment(match[1], code));
    }
    if ((match = value.match(/^(.+?) · ([A-Za-z0-9 .&/-]+)$/)) && dictionaries[code].has(match[1])) {
      return translateFragment(match[1], code) + ' · ' + match[2];
    }
    return '';
  }

  function translateTextNode(node, code) {
    if (shouldSkip(node)) return;
    if (!textOriginals.has(node)) textOriginals.set(node, node.nodeValue);
    var original = textOriginals.get(node);
    var key = normalize(original);
    if (!key) return;
    if (code === 'es') {
      node.nodeValue = original;
      return;
    }
    var translated = dictionaries[code].get(key) || translateDynamic(key, code);
    if (!translated) {
      node.nodeValue = original;
      return;
    }
    var leading = (original.match(/^\s*/) || [''])[0];
    var trailing = (original.match(/\s*$/) || [''])[0];
    node.nodeValue = leading + translated + trailing;
  }

  function translateAttributes(element, code) {
    if (element.closest('.kdl-language,[data-kdl-no-translate]')) return;
    var names = ['placeholder', 'aria-label', 'title'];
    var originals = attributeOriginals.get(element) || {};
    names.forEach(function (name) {
      if (!element.hasAttribute(name)) return;
      if (!Object.prototype.hasOwnProperty.call(originals, name)) originals[name] = element.getAttribute(name);
      var original = originals[name];
      var key = normalize(original);
      var translated = code === 'es' ? original : dictionaries[code].get(key);
      element.setAttribute(name, translated || original);
    });
    attributeOriginals.set(element, originals);
  }

  function apply(code) {
    code = supported.indexOf(code) >= 0 ? code : 'es';
    applying = true;
    document.documentElement.lang = code;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) translateTextNode(node, code);
    document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(function (element) {
      translateAttributes(element, code);
    });
    applying = false;
  }

  function setLanguage(code) {
    code = supported.indexOf(code) >= 0 ? code : 'es';
    try { localStorage.setItem(STORAGE_KEY, code); } catch (error) {}
    apply(code);
    window.dispatchEvent(new CustomEvent('kdl:languagechange', { detail: { language: code } }));
  }

  function observe() {
    if (observer || !document.body) return;
    var scheduled = false;
    observer = new MutationObserver(function () {
      if (applying || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        apply(currentLanguage());
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    apply(currentLanguage());
    observe();
  }

  window.KDLI18n = {
    getLanguage: currentLanguage,
    setLanguage: setLanguage,
    apply: apply,
    supported: supported.slice()
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

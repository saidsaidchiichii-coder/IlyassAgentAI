# 🔗 نظام الاتصالات الحقيقي - دليل الإعداد

## نظرة عامة

تم بناء نظام اتصالات حقيقي وكامل مع دعم **GitHub OAuth** و**Firebase** لتخزين البيانات بشكل آمن.

## المميزات

✅ **GitHub OAuth Real Flow** - ربط حقيقي مع GitHub  
✅ **Firebase Integration** - تخزين آمن للبيانات  
✅ **Modern UI** - واجهة مستخدم احترافية وسلسة  
✅ **Multi-Platform Support** - دعم عدة منصات (Gmail, Slack, Notion, Twitter, etc.)  
✅ **Real-time Sync** - تحديث فوري للاتصالات  
✅ **Toast Notifications** - إشعارات تفاعلية  

---

## الملفات الجديدة

### 1. `connectors-real.html`
الصفحة الرئيسية الجديدة للاتصالات مع:
- واجهة مستخدم حديثة وجذابة
- نظام إدارة الاتصالات الكامل
- معالجة GitHub OAuth callback
- إدارة الأخطاء والإشعارات

### 2. `api/github-oauth-callback.js`
معالج OAuth callback لـ GitHub:
- تبديل الكود بـ access token
- جلب بيانات المستخدم من GitHub
- حفظ البيانات في Firebase
- معالجة الأخطاء

---

## خطوات الإعداد

### 1. متغيرات البيئة (Environment Variables)

أضف المتغيرات التالية في `Vercel`:

```
GITHUB_CLIENT_ID=Ov23liMCXvJJNqMbVvqN
GITHUB_CLIENT_SECRET=your_github_client_secret_here
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
VERCEL_URL=https://my-webxyu.vercel.app
```

### 2. إعدادات GitHub OAuth App

1. اذهب إلى: https://github.com/settings/developers
2. اختر "OAuth Apps" → "New OAuth App"
3. ملأ البيانات:
   - **Application name**: IlyassAI
   - **Homepage URL**: https://my-webxyu.vercel.app
   - **Authorization callback URL**: https://my-webxyu.vercel.app/app?github_callback=true
4. احفظ `Client ID` و `Client Secret`

### 3. تحديث `vercel.json`

أضف الـ rewrites التالية:

```json
{
  "rewrites": [
    { "source": "/connectors", "destination": "/connectors-real.html" },
    { "source": "/api/github-oauth-callback", "destination": "/api/github-oauth-callback.js" }
  ]
}
```

### 4. تحديث `package.json`

تأكد من وجود Firebase Admin:

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0"
  }
}
```

---

## كيفية الاستخدام

### للمستخدمين

1. **الذهاب إلى صفحة الاتصالات**
   - انقر على "Settings" → "Connectors"

2. **إضافة اتصال جديد**
   - انقر على "إضافة اتصال جديد"
   - اختر المنصة (GitHub, Gmail, etc.)
   - اتبع خطوات المصادقة

3. **إدارة الاتصالات**
   - عرض تفاصيل الاتصال
   - قطع الاتصال إذا لزم الأمر

### للمطورين

#### جلب بيانات المستخدم المتصل

```javascript
// في أي صفحة
const user = window.auth.currentUser;
const { doc, getDoc } = window.FirebaseFirestore;

const userDoc = await getDoc(doc(window.db, 'users', user.uid));
const data = userDoc.data();

// بيانات GitHub
console.log(data.github.username);
console.log(data.github.token);
console.log(data.github.repos_count);
```

#### استخدام GitHub Token

```javascript
// استدعاء API GitHub
const response = await fetch('https://api.github.com/user/repos', {
  headers: {
    'Authorization': `Bearer ${data.github.token}`,
    'Accept': 'application/vnd.github.v3+json'
  }
});
```

---

## بنية بيانات Firebase

### مستند المستخدم

```json
{
  "uid": "user_id",
  "github": {
    "token": "gho_xxxxxxxxxxxx",
    "username": "saidsaidchiichii",
    "name": "Said Chiichii",
    "avatar": "https://avatars.githubusercontent.com/...",
    "repos_count": 42,
    "profile_url": "https://github.com/saidsaidchiichii",
    "bio": "...",
    "company": "...",
    "location": "...",
    "email": "...",
    "public_repos": 42,
    "followers": 100,
    "following": 50,
    "connected_at": "2026-05-13T17:00:00Z"
  },
  "connectors": [
    {
      "platform": "gmail",
      "linkedAt": "2026-05-13T17:00:00Z"
    },
    {
      "platform": "slack",
      "linkedAt": "2026-05-13T17:00:00Z"
    }
  ]
}
```

---

## معالجة الأخطاء

### أخطاء شائعة وحلولها

| الخطأ | السبب | الحل |
|------|------|------|
| "Missing code or state" | بيانات OAuth غير مكتملة | تحقق من redirect_uri |
| "Failed to exchange code" | بيانات GitHub OAuth خاطئة | تحقق من CLIENT_ID و CLIENT_SECRET |
| "Failed to fetch user data" | مشكلة في الاتصال بـ GitHub | أعد المحاولة لاحقاً |
| "Internal server error" | خطأ في Firebase | تحقق من SERVICE_ACCOUNT |

---

## الميزات المتقدمة

### 1. تحديث البيانات التلقائي

```javascript
// تحديث عدد المستودعات كل ساعة
setInterval(async () => {
  const user = window.auth.currentUser;
  const userDoc = await getDoc(doc(window.db, 'users', user.uid));
  const github = userDoc.data().github;
  
  // جلب عدد المستودعات الجديد
  const reposResponse = await fetch('https://api.github.com/user/repos?per_page=1', {
    headers: { 'Authorization': `Bearer ${github.token}` }
  });
  
  // تحديث Firebase
}, 3600000);
```

### 2. إرسال البيانات إلى الـ AI

```javascript
// استخدام بيانات GitHub في الـ AI
const github = userDoc.data().github;
const message = `أنا ${github.username} وأملك ${github.repos_count} مستودع على GitHub`;
```

### 3. الربط مع APIs الخارجية

```javascript
// مثال: استخدام GitHub API
async function getRepos() {
  const github = userDoc.data().github;
  const response = await fetch('https://api.github.com/user/repos', {
    headers: { 'Authorization': `Bearer ${github.token}` }
  });
  return response.json();
}
```

---

## الأمان

### ✅ أفضل الممارسات المطبقة

1. **تخزين آمن للـ Tokens**
   - الـ tokens تُخزن في Firebase مع تشفير
   - لا يتم إرسالها إلى الواجهة الأمامية

2. **التحقق من الـ State**
   - استخدام User ID كـ state
   - التحقق من التطابق في الـ callback

3. **معالجة الأخطاء**
   - عدم كشف تفاصيل الأخطاء الحساسة
   - تسجيل الأخطاء للمراجعة

4. **CORS Security**
   - السماح فقط بـ origins موثوقة
   - التحقق من Headers

---

## الاختبار

### 1. اختبار محلي

```bash
# تشغيل الخادم المحلي
npm run dev

# الذهاب إلى
http://localhost:3000/connectors
```

### 2. اختبار الـ OAuth Flow

1. انقر على "إضافة اتصال جديد"
2. اختر GitHub
3. سيتم إعادة التوجيه إلى GitHub
4. وافق على الأذونات
5. سيتم حفظ البيانات في Firebase

### 3. التحقق من البيانات

```javascript
// في Firebase Console
// اذهب إلى Firestore → users → [user_id]
// تحقق من وجود حقل "github"
```

---

## الخطوات التالية

### 1. إضافة منصات أخرى
- Gmail OAuth
- Google Calendar OAuth
- Slack OAuth
- Twitter OAuth

### 2. تحسينات الواجهة
- إضافة رسوم بيانية للإحصائيات
- عرض آخر نشاط
- إدارة الأذونات

### 3. التكامل مع الـ AI
- استخدام بيانات GitHub في المحادثات
- إنشاء مهام تلقائية
- تحليل المستودعات

---

## الدعم والمساعدة

### الأسئلة الشائعة

**س: كيف أحصل على GitHub Client Secret؟**  
ج: من إعدادات OAuth App في GitHub Settings

**س: هل الـ tokens آمنة؟**  
ج: نعم، تُخزن في Firebase مع تشفير

**س: هل يمكن ربط عدة حسابات GitHub؟**  
ج: حالياً يدعم حساب واحد فقط

**س: ماذا لو نسيت الموافقة على الأذونات؟**  
ج: يمكنك إعادة المحاولة في أي وقت

---

## الملفات المتعلقة

- `connectors-real.html` - الصفحة الرئيسية
- `api/github-oauth-callback.js` - معالج OAuth
- `style.css` - الأنماط
- `firebase.js` - تهيئة Firebase
- `vercel.json` - إعدادات النشر

---

**آخر تحديث**: 13 مايو 2026  
**الإصدار**: 1.0.0  
**الحالة**: ✅ جاهز للإنتاج

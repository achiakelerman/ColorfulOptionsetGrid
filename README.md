# בקשות לטיפול

רכיב PCF עצמאי עבור בקשות טיפול פעילות שממתינות בתור המטפלים או בתור הספקים. הרשומות ממוינות לפי דחיפות ולאחריה לפי תאריך יצירה.

## מה הרכיב מציג

- בקשות `incident` פעילות בלבד (`statecode = 0`).
- פריטי תור שממתינים לפי הערכים שהוגדרו ב־`waitingQueueItemStateCode` וב־`waitingQueueItemStatusCode`.
- תור מטפלים או תור ספקים, לפי `dashboardMode`.
- מסננים: מגדר, שפה, יום, שעה, סוג תור ועיר.
- כל הערים נטענות מ־`ey_city`; הקישור לבקשה נקבע דרך `mac_incident_ey_city`.

## הגדרות רכיב

הוסיפו את `Elad.ColorfulOptionsetGrid` לשדה בטופס של ישות עזר או ל־Custom Page, והגדירו:

| הגדרה | ערך מטפלים | ערך ספקים |
| --- | --- | --- |
| `dashboardMode` | `THERAPIST` | `PROVIDER` |
| `therapistQueueName` | שם תור המטפלים המדויק | שם תור המטפלים המדויק |
| `providerQueueName` | שם תור הספקים המדויק | שם תור הספקים המדויק |
| `waitingQueueItemStateCode` | `1` | `1` |
| `waitingQueueItemStatusCode` | `2` | `2` |

שמות השדות והטבלאות ב־Manifest הם ברירות המחדל של המערכת. משנים אותם רק כאשר הסביבה משתמשת בשמות לוגיים אחרים.

## חיבור למערכת

1. התקינו את קובץ ה־Solution שנבנה מהפרויקט.
2. ב־Power Apps, הוסיפו את רכיב ה־PCF לשדה בטופס או ל־Custom Page בתוך ה־Model-driven app.
3. בחרו `THERAPIST` או `PROVIDER` וקבעו את שמות התורים המדויקים.
4. העניקו למשתמשים הרשאת קריאה עבור `incident`, `queueitem`, `queue`, `ey_city` ו־`mac_incident_ey_city`.

Dashboard קלאסי של Dataverse אינו מארח רכיבי PCF ישירות. למסך דשבורד יש להשתמש ב־Custom Page שמכיל את הרכיב ולהוסיף את ה־Custom Page לאפליקציה. כדי להציג אותו בתוך Dashboard קלאסי יש לבנות Web Resource ייעודי, נפרד מה־PCF, ולהוסיף אותו כרכיב Web Resource בדשבורד.

## בנייה

הפרויקט דורש Node.js ב־PATH.

```powershell
npm ci
npm run build
```

לאחר הבנייה, בנו את פרויקט ה־Solution כדי לקבל קובץ ZIP לייבוא ל־Dataverse.

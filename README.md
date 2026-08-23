# בקשות לטיפול - Dataset PCF

הרכיב `Elad.ColorfulOptionsetGrid` הוא Dataset PCF עבור בקשות טיפול. הוא מציג רק את הרשומות שה־Dataset/View המארח מעביר אליו, ומבצע סינון מקומי לאחר לחיצה על `חפש`.

## עמודות Dataset נדרשות

יש להוסיף ל־View המארח את העמודות הבאות:

- `ticketnumber`, `prioritycode`, `statuscode`
- `mac_p_member_gender`, `mac_p_preferred_language`
- `mac_p_preffered_day`, `mac_p_preferred_time`
- `mac_p_preferred_queue_type`, `ey_cityid`

המסננים משתמשים ב־`getFormattedValue`, ולכן ערכי Option Set ו־Lookup מוצגים לפי תווית Dataverse ולא לפי מזהה.

## תורים ומצבי Dashboard

`queueMode` הוא פרמטר תצוגה עם הערכים `THERAPIST` ו־`PROVIDER`.

ל־Dataset API אין שדה תור מאומת ב־Manifest או בקוד הנוכחי, ולכן הרכיב אינו מנחש פילטר תור. יוצרים שני Views נפרדים של `incident`:

1. View מטפלים: מסנן את בקשות התור למטפלים לפי הקשר התור המאושר בארגון.
2. View ספקים: מסנן את בקשות התור לספקים לפי הקשר התור המאושר בארגון.

בשני ה־Views יש להגדיר את תנאי ההמתנה והפעילות בפועל. ה־PCF מקבל רק את תוצאות ה־View, מציג אותן לפי `prioritycode` מהדחוף ביותר, ומסנן את ששת שדות החיפוש.

## חיבור ל־Dynamics

1. ייבא את ZIP ה־Solution ופרסם את כל ההתאמות.
2. ערוך את ה־Dashboard ובחר רכיב רשימה/רשת שמבוסס על ה־View המתאים.
3. הגדר את הפקד `Elad.ColorfulOptionsetGrid` עבור ה־Dataset של הרשימה.
4. ודא שכל עמודות ה־Dataset הנדרשות נכללות ב־View.
5. בלוח מטפלים הגדר `queueMode=THERAPIST`; בלוח ספקים הגדר `queueMode=PROVIDER`.
6. שמור ופרסם את ה־Dashboard.

בדיקה: בטעינה יוצגו כל הרשומות מה־View, לחיצה על `חפש` מפעילה את המסננים, `נקה חיפוש` מחזיר את כל הרשומות, ולחיצה כפולה על שורה פותחת את בקשת ה־`incident`.

## בנייה

```powershell
npm install
npm run build
dotnet build Solution/Solution.cdsproj -c Release
```

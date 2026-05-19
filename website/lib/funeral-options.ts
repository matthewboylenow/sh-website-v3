/**
 * Hardcoded option lists for the funeral intake form.
 *
 * These mirror what's on the legacy FluentForms page at
 * sainthelen.org/funerals — readings reference the parish PDFs
 * (linked from the public page) and the hymns are the standard
 * Catholic funeral repertoire used by the music director.
 *
 * Edit this file in-place when the lists need to change. Reading
 * codes (OT-* / NT-*) match the PDF the parish hands to families.
 */

export const MASS_TIMES = ["10:00am", "11:30am"] as const;

export const REMAINS_KINDS = ["Casket", "Cremated Remains", "Other"] as const;

export const YES_NO = ["Yes", "No"] as const;
export const YES_NO_NA = ["Yes", "No", "N/A"] as const;
export const MARITAL_STATUSES = ["Married", "Single"] as const;
export const SPOUSE_STATUSES = ["Living", "Deceased"] as const;
export const INTERCESSION_OPTIONS = ["Option A", "Option B"] as const;

/** First Reading codes — Old Testament + NT (Easter) options. */
export const FIRST_READING_OPTIONS = [
  "OT-1",
  "OT-2",
  "OT-3",
  "OT-4",
  "OT-5",
  "OT-6",
  "OT-7",
  "OT-8",
  "OT-9",
  "NT-10 (Easter)",
  "NT-11 (Easter)",
  "NT-12 (Easter)",
  "NT-13 (Easter)",
] as const;

/** Second Reading codes — New Testament epistle options. */
export const SECOND_READING_OPTIONS = [
  "NT-1",
  "NT-2",
  "NT-3",
  "NT-4",
  "NT-5",
  "NT-6",
  "NT-7",
  "NT-8",
  "NT-9",
  "NT-10",
  "NT-11",
  "NT-12",
  "NT-13",
  "NT-14",
  "NT-15",
  "NT-16",
  "NT-17",
  "NT-18",
  "NT-19",
] as const;

/* ------------------------------------------------------------------ */
/* Music for the Mass of Christian Burial                              */
/* ------------------------------------------------------------------ */

export const ENTRANCE_HYMNS = [
  "Amazing Grace (traditional)",
  "How Great Thou Art",
  "Be Not Afraid (Dufford)",
  "Here I Am, Lord (Schutte)",
  "On Eagle's Wings (Joncas)",
  "Lord of All Hopefulness",
  "I Heard the Voice of Jesus",
  "For All the Saints",
  "Songs of the Angels (Dufford)",
  "Jerusalem, My Happy Home",
] as const;

export const PSALM_OPTIONS = [
  "Ps. 23 The Lord is my Shepherd (Blakesley)",
  "Ps. 23 The Lord is my Shepherd (Crusader)",
  "Ps. 25 To You, O Lord, I Lift My Soul",
  "Ps. 27 The Lord is My Light and My Salvation",
  "Ps. 42 Like a Deer That Longs",
  "Ps. 63 My Soul is Thirsting",
  "Ps. 103 The Lord is Kind and Merciful",
] as const;

export const PREPARATION_HYMNS = [
  "Ave Maria (Schubert)",
  "Ave Maria (Bach/Gounod)",
  "Panis Angelicus (Franck)",
  "Pie Jesu (Webber)",
  "The Prayer of St. Francis (Temple)",
  "You Are Mine (Haas)",
  "Shepherd Me, O God (Haugen)",
  "Hail Mary, Gentle Woman (Landry)",
  "Be Still My Soul",
  "I Am the Bread of Life (Toolan)",
  "Eye Has Not Seen (Haugen)",
  "Precious Lord, Take My Hand",
] as const;

export const COMMUNION_HYMNS = [
  "Here I Am Lord (Schutte)",
  "I Am the Bread of Life (Toolan)",
  "One Bread, One Body (Foley)",
  "Taste and See (Moore)",
  "Gift of Finest Wheat",
  "Eat This Bread (Berthier)",
  "Bread of Life (Farrell)",
  "Pan de Vida (Hurd)",
  "Shepherd of Souls",
  "We Walk by Faith (Haas)",
] as const;

export const COMMENDATION_HYMNS = [
  "Come To Me (Les Miserables)",
  "Song of Farewell (Sands)",
  "Saints of God / In Paradisum",
  "May the Angels Lead You into Paradise",
  "May Choirs of Angels (Joncas)",
] as const;

export const RECESSIONAL_HYMNS = [
  "On Eagle's Wings (Joncas)",
  "How Great Thou Art",
  "Amazing Grace",
  "Lift High the Cross",
  "Sing With All the Saints in Glory",
  "Soon and Very Soon",
  "When the Saints Go Marching In",
  "Be Not Afraid (Dufford)",
  "I Know That My Redeemer Lives",
  "Joyful, Joyful, We Adore Thee",
  "Hail, Holy Queen Enthroned Above",
] as const;

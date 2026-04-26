/**
 * Curated catalog of lucide-react icons relevant to a Catholic parish:
 * faith + sacraments + community + small groups + service + parish life.
 *
 * Each entry: lucide PascalCase component name (used as the stable ID
 * stored in card payloads), a human label, and search tags. The picker
 * filters across name + label + tags.
 *
 * Adding new icons is a one-line code change. Removing one is safe even
 * if existing cards reference it — IconRender falls back to null and the
 * tile renders the placeholder arrow.
 */

export type IconCatalogEntry = {
  /** Stable id stored in DB. Matches the lucide-react export name. */
  name: string;
  /** Human-readable label shown in the picker. */
  label: string;
  /** Free-text search tags. */
  tags: string[];
  /** Loose grouping for the picker UI. */
  group: IconGroup;
};

export type IconGroup =
  | "Faith & worship"
  | "Sacraments & rites"
  | "Community & people"
  | "Family & life"
  | "Service & charity"
  | "Formation & study"
  | "Music & arts"
  | "Events & calendar"
  | "Places & gathering"
  | "Giving & stewardship"
  | "Hospitality & food"
  | "Communication"
  | "Nature & seasons"
  | "Symbols & emblems";

export const ICON_CATALOG: ReadonlyArray<IconCatalogEntry> = [
  // ─── Faith & worship ───────────────────────────────────────────────
  { name: "Church", label: "Church", group: "Faith & worship", tags: ["church", "parish", "sanctuary", "building", "worship"] },
  { name: "Cross", label: "Cross", group: "Faith & worship", tags: ["cross", "christ", "crucifix", "faith"] },
  { name: "Sparkles", label: "Sparkles", group: "Faith & worship", tags: ["sparkles", "holy", "spirit", "shine", "grace"] },
  { name: "Flame", label: "Flame", group: "Faith & worship", tags: ["flame", "fire", "holy spirit", "candle", "pentecost"] },
  { name: "Sun", label: "Sun", group: "Faith & worship", tags: ["sun", "light", "easter", "resurrection"] },
  { name: "Sunrise", label: "Sunrise", group: "Faith & worship", tags: ["sunrise", "dawn", "easter", "new", "hope"] },
  { name: "Star", label: "Star", group: "Faith & worship", tags: ["star", "epiphany", "advent", "bethlehem"] },
  { name: "Stars", label: "Stars", group: "Faith & worship", tags: ["stars", "advent", "heaven", "night"] },
  { name: "Crown", label: "Crown", group: "Faith & worship", tags: ["crown", "king", "christ", "majesty"] },
  { name: "Eye", label: "Eye", group: "Faith & worship", tags: ["eye", "watchful", "providence", "vigil"] },
  { name: "Bird", label: "Bird", group: "Faith & worship", tags: ["bird", "dove", "holy spirit", "peace"] },
  { name: "Fish", label: "Fish", group: "Faith & worship", tags: ["fish", "ichthys", "christ", "apostles"] },
  { name: "Anchor", label: "Anchor", group: "Faith & worship", tags: ["anchor", "hope", "hebrews", "steadfast"] },
  { name: "Shield", label: "Shield", group: "Faith & worship", tags: ["shield", "armor", "protection", "faith"] },
  { name: "Key", label: "Key", group: "Faith & worship", tags: ["key", "kingdom", "peter", "authority"] },
  { name: "Feather", label: "Feather", group: "Faith & worship", tags: ["feather", "scribe", "scripture", "psalms"] },
  { name: "Mountain", label: "Mountain", group: "Faith & worship", tags: ["mountain", "sermon", "transfiguration", "pilgrimage"] },
  { name: "TentTree", label: "Pilgrim tent", group: "Faith & worship", tags: ["tent", "tabernacle", "pilgrim", "wandering", "exodus"] },
  { name: "Hourglass", label: "Hourglass", group: "Faith & worship", tags: ["hourglass", "time", "lent", "advent", "vigil"] },

  // ─── Sacraments & rites ───────────────────────────────────────────
  { name: "Droplet", label: "Water drop", group: "Sacraments & rites", tags: ["baptism", "water", "drop", "font"] },
  { name: "Droplets", label: "Water drops", group: "Sacraments & rites", tags: ["baptism", "water", "drops", "blessing"] },
  { name: "Wine", label: "Chalice", group: "Sacraments & rites", tags: ["wine", "chalice", "communion", "eucharist", "mass"] },
  { name: "Wheat", label: "Wheat", group: "Sacraments & rites", tags: ["wheat", "bread", "host", "eucharist", "harvest"] },
  { name: "GlassWater", label: "Cup", group: "Sacraments & rites", tags: ["cup", "water", "glass", "blessing"] },
  { name: "Heart", label: "Heart", group: "Sacraments & rites", tags: ["heart", "love", "marriage", "matrimony", "sacred heart"] },
  { name: "HandHeart", label: "Hand + heart", group: "Sacraments & rites", tags: ["hand", "heart", "anointing", "blessing"] },
  { name: "Hand", label: "Open hand", group: "Sacraments & rites", tags: ["hand", "blessing", "ordination", "laying hands"] },
  { name: "BookOpen", label: "Open book", group: "Sacraments & rites", tags: ["book", "bible", "lectionary", "scripture", "reading"] },
  { name: "BookHeart", label: "Bible + heart", group: "Sacraments & rites", tags: ["bible", "heart", "love", "scripture"] },
  { name: "BookMarked", label: "Marked book", group: "Sacraments & rites", tags: ["book", "missal", "ribbon", "lectionary"] },
  { name: "ScrollText", label: "Scroll", group: "Sacraments & rites", tags: ["scroll", "law", "torah", "scripture", "ancient"] },

  // ─── Community & people ───────────────────────────────────────────
  { name: "Users", label: "Group of people", group: "Community & people", tags: ["users", "group", "community", "small group", "people"] },
  { name: "UsersRound", label: "Friendly group", group: "Community & people", tags: ["users", "group", "fellowship", "circle", "community"] },
  { name: "User", label: "Person", group: "Community & people", tags: ["user", "person", "individual"] },
  { name: "UserPlus", label: "Welcome (add user)", group: "Community & people", tags: ["welcome", "new", "join", "add", "newcomer"] },
  { name: "UserCheck", label: "User check", group: "Community & people", tags: ["confirmed", "verified", "check", "registered"] },
  { name: "UserCog", label: "Volunteer coordinator", group: "Community & people", tags: ["coordinator", "leader", "volunteer", "settings"] },
  { name: "Handshake", label: "Handshake", group: "Community & people", tags: ["handshake", "welcome", "agreement", "fellowship"] },
  { name: "HeartHandshake", label: "Caring handshake", group: "Community & people", tags: ["handshake", "heart", "care", "covenant", "support"] },
  { name: "HandHelping", label: "Helping hand", group: "Community & people", tags: ["help", "hand", "service", "support", "volunteer"] },
  { name: "Speech", label: "Speech", group: "Community & people", tags: ["speech", "talking", "conversation", "share"] },
  { name: "Smile", label: "Smile", group: "Community & people", tags: ["smile", "joy", "welcome", "friendly"] },
  { name: "PartyPopper", label: "Celebration", group: "Community & people", tags: ["celebrate", "party", "joy", "feast", "event", "festival"] },
  { name: "Accessibility", label: "Accessibility", group: "Community & people", tags: ["accessibility", "inclusion", "wheelchair"] },
  { name: "PersonStanding", label: "Person", group: "Community & people", tags: ["person", "standing", "individual"] },
  { name: "Footprints", label: "Footprints", group: "Community & people", tags: ["footprints", "walk", "journey", "discipleship", "follow", "small group", "together"] },
  { name: "Fingerprint", label: "Fingerprint", group: "Community & people", tags: ["identity", "unique", "person"] },
  { name: "Network", label: "Network", group: "Community & people", tags: ["network", "connection", "community", "ties"] },
  { name: "Workflow", label: "Connections", group: "Community & people", tags: ["workflow", "connections", "ministry", "team"] },
  { name: "Puzzle", label: "Puzzle piece", group: "Community & people", tags: ["puzzle", "fit", "belong", "place"] },
  { name: "Ribbon", label: "Ribbon", group: "Community & people", tags: ["ribbon", "awareness", "remembrance", "support"] },

  // ─── Family & life ────────────────────────────────────────────────
  { name: "Baby", label: "Baby", group: "Family & life", tags: ["baby", "infant", "baptism", "new"] },
  { name: "Cake", label: "Cake", group: "Family & life", tags: ["cake", "birthday", "celebrate", "anniversary"] },
  { name: "House", label: "House", group: "Family & life", tags: ["house", "home", "domestic", "family"] },
  { name: "HouseHeart", label: "Loving home", group: "Family & life", tags: ["home", "house", "heart", "family", "domestic church"] },
  { name: "HousePlus", label: "Welcoming home", group: "Family & life", tags: ["home", "welcome", "new family", "household"] },
  { name: "HeartPulse", label: "Heartbeat", group: "Family & life", tags: ["heart", "pulse", "life", "health"] },
  { name: "Stethoscope", label: "Stethoscope", group: "Family & life", tags: ["health", "medical", "anointing", "sick"] },
  { name: "Activity", label: "Vital signs", group: "Family & life", tags: ["activity", "life", "health", "monitor"] },

  // ─── Service & charity ────────────────────────────────────────────
  { name: "Hammer", label: "Hammer", group: "Service & charity", tags: ["hammer", "build", "habitat", "service", "labor"] },
  { name: "Wrench", label: "Wrench", group: "Service & charity", tags: ["wrench", "repair", "service", "fix"] },
  { name: "Brush", label: "Brush", group: "Service & charity", tags: ["brush", "clean", "paint", "service"] },
  { name: "Paintbrush", label: "Paintbrush", group: "Service & charity", tags: ["paint", "brush", "service", "art"] },
  { name: "Construction", label: "Construction", group: "Service & charity", tags: ["construction", "build", "service", "habitat"] },
  { name: "ShoppingBasket", label: "Food basket", group: "Service & charity", tags: ["basket", "food", "pantry", "donation", "outreach"] },
  { name: "ShoppingBag", label: "Donation bag", group: "Service & charity", tags: ["bag", "donation", "outreach", "carry"] },
  { name: "Backpack", label: "Backpack", group: "Service & charity", tags: ["backpack", "school", "back to school", "kids", "supplies"] },
  { name: "Package", label: "Care package", group: "Service & charity", tags: ["package", "care", "delivery", "outreach"] },
  { name: "PackageOpen", label: "Opened package", group: "Service & charity", tags: ["package", "gift", "open", "share"] },
  { name: "Truck", label: "Delivery truck", group: "Service & charity", tags: ["truck", "delivery", "outreach", "food drive"] },
  { name: "Soup", label: "Soup", group: "Service & charity", tags: ["soup", "kitchen", "meal", "lent", "service"] },
  { name: "Sandwich", label: "Sandwich", group: "Service & charity", tags: ["sandwich", "meal", "lunch", "feed"] },
  { name: "Salad", label: "Salad", group: "Service & charity", tags: ["salad", "meal", "healthy", "feed"] },
  { name: "HandPlatter", label: "Serving platter", group: "Service & charity", tags: ["serve", "platter", "ministry", "hospitality"] },
  { name: "HandCoins", label: "Hand giving coins", group: "Service & charity", tags: ["give", "coins", "alms", "charity"] },
  { name: "Sprout", label: "Sprout", group: "Service & charity", tags: ["sprout", "growth", "seed", "new life", "stewardship"] },

  // ─── Formation & study ────────────────────────────────────────────
  { name: "Book", label: "Book", group: "Formation & study", tags: ["book", "study", "read", "formation"] },
  { name: "BookOpenText", label: "Open book", group: "Formation & study", tags: ["book", "study", "scripture", "open"] },
  { name: "BookOpenCheck", label: "Completed study", group: "Formation & study", tags: ["book", "complete", "graduate", "study"] },
  { name: "BookCheck", label: "Verified text", group: "Formation & study", tags: ["book", "verified", "approved", "study"] },
  { name: "Library", label: "Library", group: "Formation & study", tags: ["library", "books", "study", "resources"] },
  { name: "GraduationCap", label: "Graduation cap", group: "Formation & study", tags: ["graduation", "school", "rcia", "formation", "completion"] },
  { name: "PencilLine", label: "Pencil", group: "Formation & study", tags: ["pencil", "write", "register", "sign up"] },
  { name: "Pencil", label: "Pencil edit", group: "Formation & study", tags: ["pencil", "write", "edit"] },
  { name: "Pen", label: "Pen", group: "Formation & study", tags: ["pen", "write", "sign"] },
  { name: "NotebookPen", label: "Notebook + pen", group: "Formation & study", tags: ["notebook", "study", "register", "journal"] },
  { name: "ClipboardList", label: "Clipboard list", group: "Formation & study", tags: ["clipboard", "list", "form", "register"] },
  { name: "ListChecks", label: "Checklist", group: "Formation & study", tags: ["list", "checklist", "tasks", "steps"] },
  { name: "Lightbulb", label: "Lightbulb", group: "Formation & study", tags: ["lightbulb", "idea", "insight", "learn"] },
  { name: "Brain", label: "Brain", group: "Formation & study", tags: ["brain", "mind", "learn", "study", "intellect"] },
  { name: "Telescope", label: "Telescope", group: "Formation & study", tags: ["telescope", "discover", "see", "look"] },
  { name: "Microscope", label: "Microscope", group: "Formation & study", tags: ["microscope", "study", "research"] },
  { name: "Newspaper", label: "Newspaper", group: "Formation & study", tags: ["newspaper", "bulletin", "news", "weekly"] },
  { name: "FileText", label: "Document", group: "Formation & study", tags: ["file", "document", "form", "register"] },
  { name: "Bookmark", label: "Bookmark", group: "Formation & study", tags: ["bookmark", "save", "ribbon"] },
  { name: "BookmarkCheck", label: "Saved bookmark", group: "Formation & study", tags: ["bookmark", "saved", "complete"] },

  // ─── Music & arts ─────────────────────────────────────────────────
  { name: "Music", label: "Music note", group: "Music & arts", tags: ["music", "note", "choir", "song", "psalm"] },
  { name: "Music2", label: "Music note (alt)", group: "Music & arts", tags: ["music", "note", "choir"] },
  { name: "Music3", label: "Music note (alt 2)", group: "Music & arts", tags: ["music", "note", "choir"] },
  { name: "Music4", label: "Music note (alt 3)", group: "Music & arts", tags: ["music", "note", "choir"] },
  { name: "Mic", label: "Microphone", group: "Music & arts", tags: ["microphone", "mic", "speak", "sing"] },
  { name: "Mic2", label: "Microphone (alt)", group: "Music & arts", tags: ["microphone", "mic", "podcast", "speak"] },
  { name: "Headphones", label: "Headphones", group: "Music & arts", tags: ["headphones", "podcast", "listen", "audio"] },
  { name: "Speaker", label: "Speaker", group: "Music & arts", tags: ["speaker", "audio", "sound"] },
  { name: "Volume2", label: "Volume", group: "Music & arts", tags: ["volume", "audio", "sound"] },
  { name: "Radio", label: "Radio", group: "Music & arts", tags: ["radio", "broadcast", "audio"] },
  { name: "Bell", label: "Bell", group: "Music & arts", tags: ["bell", "ring", "tower", "call"] },
  { name: "BellRing", label: "Bell ringing", group: "Music & arts", tags: ["bell", "ring", "alert", "notify", "tower"] },
  { name: "Drum", label: "Drum", group: "Music & arts", tags: ["drum", "music", "rhythm"] },
  { name: "Guitar", label: "Guitar", group: "Music & arts", tags: ["guitar", "music", "praise"] },
  { name: "Piano", label: "Piano", group: "Music & arts", tags: ["piano", "music", "keys"] },
  { name: "Camera", label: "Camera", group: "Music & arts", tags: ["camera", "photo", "media"] },
  { name: "Image", label: "Image", group: "Music & arts", tags: ["image", "photo", "picture"] },
  { name: "Video", label: "Video", group: "Music & arts", tags: ["video", "stream", "watch"] },
  { name: "Film", label: "Film reel", group: "Music & arts", tags: ["film", "movie", "video"] },
  { name: "Megaphone", label: "Megaphone", group: "Music & arts", tags: ["megaphone", "announce", "outreach", "evangelize"] },

  // ─── Events & calendar ────────────────────────────────────────────
  { name: "Calendar", label: "Calendar", group: "Events & calendar", tags: ["calendar", "date", "event", "schedule"] },
  { name: "CalendarDays", label: "Calendar (days)", group: "Events & calendar", tags: ["calendar", "month", "schedule", "days"] },
  { name: "CalendarHeart", label: "Calendar + heart", group: "Events & calendar", tags: ["calendar", "heart", "favorite", "celebration"] },
  { name: "CalendarClock", label: "Calendar + clock", group: "Events & calendar", tags: ["calendar", "time", "schedule"] },
  { name: "CalendarCheck", label: "Calendar (confirmed)", group: "Events & calendar", tags: ["calendar", "confirm", "rsvp", "register"] },
  { name: "CalendarPlus", label: "Add to calendar", group: "Events & calendar", tags: ["calendar", "add", "schedule", "new"] },
  { name: "Clock", label: "Clock", group: "Events & calendar", tags: ["clock", "time", "schedule"] },
  { name: "Timer", label: "Timer", group: "Events & calendar", tags: ["timer", "duration", "minutes"] },
  { name: "History", label: "History", group: "Events & calendar", tags: ["history", "past", "archive", "tradition"] },
  { name: "Ticket", label: "Ticket", group: "Events & calendar", tags: ["ticket", "rsvp", "event", "admission"] },

  // ─── Places & gathering ───────────────────────────────────────────
  { name: "Home", label: "Home", group: "Places & gathering", tags: ["home", "house", "domestic"] },
  { name: "Building", label: "Building", group: "Places & gathering", tags: ["building", "office", "rectory"] },
  { name: "Building2", label: "Building (alt)", group: "Places & gathering", tags: ["building", "hall", "school"] },
  { name: "School", label: "School", group: "Places & gathering", tags: ["school", "classroom", "education"] },
  { name: "Castle", label: "Castle", group: "Places & gathering", tags: ["castle", "fortress", "kingdom"] },
  { name: "Coffee", label: "Coffee gathering", group: "Places & gathering", tags: ["coffee", "fellowship", "small group", "social"] },
  { name: "Tent", label: "Tent", group: "Places & gathering", tags: ["tent", "retreat", "camp", "gathering"] },
  { name: "Map", label: "Map", group: "Places & gathering", tags: ["map", "location", "find", "directions"] },
  { name: "MapPin", label: "Map pin", group: "Places & gathering", tags: ["map", "pin", "location", "address"] },
  { name: "Compass", label: "Compass", group: "Places & gathering", tags: ["compass", "direction", "guidance", "find"] },
  { name: "Globe", label: "Globe", group: "Places & gathering", tags: ["globe", "world", "missions", "outreach"] },
  { name: "Earth", label: "Earth", group: "Places & gathering", tags: ["earth", "world", "creation", "missions"] },
  { name: "Plane", label: "Plane", group: "Places & gathering", tags: ["plane", "travel", "missions", "trip"] },
  { name: "Ship", label: "Ship", group: "Places & gathering", tags: ["ship", "boat", "barque", "peter"] },
  { name: "Car", label: "Car", group: "Places & gathering", tags: ["car", "ride", "travel", "carpool"] },
  { name: "Bus", label: "Bus", group: "Places & gathering", tags: ["bus", "trip", "pilgrimage", "travel"] },
  { name: "Trees", label: "Trees", group: "Places & gathering", tags: ["trees", "park", "outdoor", "creation"] },
  { name: "TreePine", label: "Pine tree", group: "Places & gathering", tags: ["pine", "tree", "advent", "christmas"] },

  // ─── Giving & stewardship ─────────────────────────────────────────
  { name: "Gift", label: "Gift", group: "Giving & stewardship", tags: ["gift", "donate", "give", "blessing"] },
  { name: "DollarSign", label: "Dollar sign", group: "Giving & stewardship", tags: ["dollar", "money", "give", "donate"] },
  { name: "BadgeDollarSign", label: "Donation badge", group: "Giving & stewardship", tags: ["donation", "give", "badge"] },
  { name: "CircleDollarSign", label: "Circled dollar", group: "Giving & stewardship", tags: ["money", "give", "donation"] },
  { name: "Coins", label: "Coins", group: "Giving & stewardship", tags: ["coins", "money", "alms", "treasure"] },
  { name: "PiggyBank", label: "Piggy bank", group: "Giving & stewardship", tags: ["savings", "stewardship", "give", "kids"] },
  { name: "Wallet", label: "Wallet", group: "Giving & stewardship", tags: ["wallet", "money", "give"] },
  { name: "CreditCard", label: "Credit card", group: "Giving & stewardship", tags: ["card", "online", "give", "donate"] },
  { name: "Banknote", label: "Banknote", group: "Giving & stewardship", tags: ["money", "cash", "donate"] },
  { name: "Receipt", label: "Receipt", group: "Giving & stewardship", tags: ["receipt", "tax", "record", "donation"] },
  { name: "Goal", label: "Goal", group: "Giving & stewardship", tags: ["goal", "target", "campaign", "stewardship"] },
  { name: "Target", label: "Target", group: "Giving & stewardship", tags: ["target", "goal", "campaign"] },
  { name: "Trophy", label: "Trophy", group: "Giving & stewardship", tags: ["trophy", "achievement", "campaign"] },
  { name: "Award", label: "Award", group: "Giving & stewardship", tags: ["award", "recognition", "honor"] },
  { name: "Medal", label: "Medal", group: "Giving & stewardship", tags: ["medal", "honor", "saint"] },

  // ─── Hospitality & food ───────────────────────────────────────────
  { name: "UtensilsCrossed", label: "Utensils", group: "Hospitality & food", tags: ["utensils", "meal", "dinner", "feast"] },
  { name: "Cookie", label: "Cookie", group: "Hospitality & food", tags: ["cookie", "treat", "kids", "fellowship"] },
  { name: "Croissant", label: "Croissant", group: "Hospitality & food", tags: ["croissant", "breakfast", "coffee hour"] },
  { name: "Donut", label: "Donut", group: "Hospitality & food", tags: ["donut", "coffee hour", "treat"] },
  { name: "Apple", label: "Apple", group: "Hospitality & food", tags: ["apple", "fruit", "fall", "harvest"] },
  { name: "Carrot", label: "Carrot", group: "Hospitality & food", tags: ["carrot", "vegetable", "garden", "harvest"] },
  { name: "Cherry", label: "Cherry", group: "Hospitality & food", tags: ["cherry", "fruit", "summer"] },
  { name: "Egg", label: "Egg", group: "Hospitality & food", tags: ["egg", "easter", "breakfast"] },
  { name: "Pizza", label: "Pizza", group: "Hospitality & food", tags: ["pizza", "youth", "social", "meal"] },

  // ─── Communication ────────────────────────────────────────────────
  { name: "Mail", label: "Mail", group: "Communication", tags: ["mail", "email", "letter", "contact"] },
  { name: "Phone", label: "Phone", group: "Communication", tags: ["phone", "call", "contact"] },
  { name: "PhoneCall", label: "Phone call", group: "Communication", tags: ["phone", "call", "ring"] },
  { name: "MessageCircle", label: "Message", group: "Communication", tags: ["message", "chat", "conversation"] },
  { name: "MessageSquare", label: "Message (square)", group: "Communication", tags: ["message", "chat", "comment"] },
  { name: "Send", label: "Send", group: "Communication", tags: ["send", "submit", "share"] },
  { name: "AtSign", label: "At sign", group: "Communication", tags: ["at", "email", "contact"] },
  { name: "Inbox", label: "Inbox", group: "Communication", tags: ["inbox", "mail", "messages"] },
  { name: "Share2", label: "Share", group: "Communication", tags: ["share", "spread", "evangelize"] },
  { name: "Rss", label: "RSS / feed", group: "Communication", tags: ["rss", "feed", "subscribe", "podcast"] },
  { name: "Link", label: "Link", group: "Communication", tags: ["link", "url", "website"] },
  { name: "ExternalLink", label: "External link", group: "Communication", tags: ["external", "link", "outbound"] },
  { name: "Search", label: "Search", group: "Communication", tags: ["search", "find", "lookup"] },
  { name: "Info", label: "Info", group: "Communication", tags: ["info", "information", "about"] },
  { name: "HelpCircle", label: "Help", group: "Communication", tags: ["help", "question", "faq"] },

  // ─── Nature & seasons ─────────────────────────────────────────────
  { name: "Leaf", label: "Leaf", group: "Nature & seasons", tags: ["leaf", "fall", "creation", "nature"] },
  { name: "Flower", label: "Flower", group: "Nature & seasons", tags: ["flower", "easter", "spring", "creation"] },
  { name: "Flower2", label: "Flower (alt)", group: "Nature & seasons", tags: ["flower", "garden", "spring"] },
  { name: "Snowflake", label: "Snowflake", group: "Nature & seasons", tags: ["snow", "winter", "advent", "christmas"] },
  { name: "CloudSun", label: "Cloud + sun", group: "Nature & seasons", tags: ["cloud", "sun", "weather"] },
  { name: "Cloud", label: "Cloud", group: "Nature & seasons", tags: ["cloud", "sky", "heaven"] },
  { name: "Moon", label: "Moon", group: "Nature & seasons", tags: ["moon", "night", "vigil"] },
  { name: "SunMoon", label: "Sun + moon", group: "Nature & seasons", tags: ["sun", "moon", "day", "night"] },
  { name: "Sunset", label: "Sunset", group: "Nature & seasons", tags: ["sunset", "evening", "vespers"] },
  { name: "Wind", label: "Wind", group: "Nature & seasons", tags: ["wind", "spirit", "breath", "ruach"] },
  { name: "Cat", label: "Cat", group: "Nature & seasons", tags: ["cat", "animal", "creature"] },
  { name: "Dog", label: "Dog", group: "Nature & seasons", tags: ["dog", "animal", "creature", "blessing"] },
  { name: "Rabbit", label: "Rabbit", group: "Nature & seasons", tags: ["rabbit", "animal", "easter", "spring"] },

  // ─── Symbols & emblems ────────────────────────────────────────────
  { name: "Sword", label: "Sword", group: "Symbols & emblems", tags: ["sword", "spirit", "armor", "battle"] },
  { name: "Crosshair", label: "Crosshair", group: "Symbols & emblems", tags: ["focus", "aim", "discernment"] },
  { name: "Flag", label: "Flag", group: "Symbols & emblems", tags: ["flag", "marker", "banner"] },
  { name: "Gem", label: "Gem", group: "Symbols & emblems", tags: ["gem", "treasure", "pearl", "kingdom"] },
  { name: "Diamond", label: "Diamond", group: "Symbols & emblems", tags: ["diamond", "treasure", "precious"] },
  { name: "CheckCircle", label: "Check circle", group: "Symbols & emblems", tags: ["check", "complete", "confirmed"] },
  { name: "Check", label: "Check", group: "Symbols & emblems", tags: ["check", "yes", "done"] },
  { name: "Plus", label: "Plus", group: "Symbols & emblems", tags: ["plus", "add", "new", "cross"] },
  { name: "Tag", label: "Tag", group: "Symbols & emblems", tags: ["tag", "label", "category"] },
  { name: "Tags", label: "Tags", group: "Symbols & emblems", tags: ["tags", "labels", "categories"] },
  { name: "Layers", label: "Layers", group: "Symbols & emblems", tags: ["layers", "structure", "depth"] },
  { name: "Briefcase", label: "Briefcase", group: "Symbols & emblems", tags: ["briefcase", "work", "professional", "career"] },
] as const;

const NAME_SET = new Set(ICON_CATALOG.map((i) => i.name));

export function isValidIconName(name: string): boolean {
  return NAME_SET.has(name);
}

/** Returns entries matching a free-text search across name + label + tags. */
export function searchIcons(query: string): IconCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...ICON_CATALOG];
  return ICON_CATALOG.filter((entry) => {
    if (entry.name.toLowerCase().includes(q)) return true;
    if (entry.label.toLowerCase().includes(q)) return true;
    return entry.tags.some((t) => t.toLowerCase().includes(q));
  });
}

export const ICON_GROUPS: ReadonlyArray<IconGroup> = [
  "Faith & worship",
  "Sacraments & rites",
  "Community & people",
  "Family & life",
  "Service & charity",
  "Formation & study",
  "Music & arts",
  "Events & calendar",
  "Places & gathering",
  "Giving & stewardship",
  "Hospitality & food",
  "Communication",
  "Nature & seasons",
  "Symbols & emblems",
];



export type Language = "en" | "my";

type TranslationTable = Record<string, string>;

const translations: Record<Language, TranslationTable> = {
  en: {
    "common.close": "CLOSE",
    "common.clickCrossExit": "CLICK RED × TO EXIT",
    "common.language": "LANGUAGE",
    "common.english": "ENGLISH",
    "common.myanmar": "MYANMAR",
    "common.saved": "GAME SAVED!",
    "common.loaded": "GAME LOADED!",
    "common.noSave": "NO SAVE FOUND - NEW GAME",
    "common.saveFailed": "SAVE FAILED!",
    "common.loadFailed": "LOAD FAILED!",

    "help.title": "HOW TO PLAY",
    "help.subtitle": "The essentials at a glance. Use the icons and controls below.",
    "help.moveTitle": "MOVE AROUND",
    "help.moveBody": "W A S D / ARROW KEYS\nTOOLS: 1–4",
    "help.villageTitle": "VILLAGE ACTIONS",
    "help.villageBody": "E: TALK / MARKET\nR: DAILY REQUESTS\nSPACE: USE TOOL",
    "help.farmTitle": "GROW YOUR RICE",
    "help.farmBody": "HOE → PLANT → WATER DAILY\nHARVEST AFTER 4 WATERED DAYS",
    "help.fishingTitle": "GO FISHING",
    "help.fishingBody": "BUY A ROD AT MARKET\nF CAST · SPACE REEL\nCATCHES VARY BY TIME",
    "help.cookingTitle": "COOK AT HOME",
    "help.cookingBody": "E TO COOK · 1–3 RECIPES\nQ TO EAT A MEAL",
    "help.houseTitle": "YOUR HOME",
    "help.houseBody": "E TO ENTER YOUR HOUSE\nSLEEP · STORE ITEMS · COOK\nESC OR RED × TO EXIT",

    "house.title": "MY HOME",
    "house.bed": "BED",
    "house.chest": "STORAGE CHEST",
    "house.cooker": "COOKING HEARTH",
    "house.enterPrompt": "E · ENTER YOUR HOME",
    "house.controls": "WASD / ARROWS MOVE · E USE · ESC EXIT",
    "house.useBed": "SLEEP",
    "house.openChest": "OPEN CHEST",
    "house.useCooker": "COOK",
    "house.exitDoor": "EXIT HOME",
    "house.welcome": "A quiet place to rest, store goods and cook.",
    "house.sleeping": "You settle down for a rest...",
    "house.woke": "You wake at {time} · Day {day}",

    "chest.title": "HOME STORAGE CHEST",
    "chest.bag": "BACKPACK",
    "chest.chest": "CHEST",
    "chest.subtitle": "Move goods between your backpack and the chest.",
    "chest.seeds": "Rice Seeds",
    "chest.rice": "Harvested Rice",
    "chest.silverBarb": "Silver Barb",
    "chest.catfish": "River Catfish",
    "chest.goldenCarp": "Golden Carp",
    "chest.fishRice": "Fish & Rice Bowl",
    "chest.mohinga": "Mohinga",
    "chest.fishCurry": "Golden Carp Curry",
    "chest.put": "STORE",
    "chest.take": "TAKE",
    "chest.stored": "Stored {amount} item(s).",
    "chest.taken": "Moved {amount} item(s) to your backpack.",
    "chest.nothingToStore": "You have none of this item to store.",
    "chest.empty": "There is none of this item in the chest.",

    "profile.title": "FARMER PROFILE",
    "profile.name": "PLAYER NAME: {name}",
    "profile.rename": "RENAME",
    "profile.outfit": "CHOOSE YOUR SHIRT",
    "profile.close": "Choose an outfit or rename your farmer.",
    "profile.defaultName": "Farmer",
    "profile.outfit.green": "VILLAGE GREEN",
    "profile.outfit.blue": "RIVER BLUE",
    "profile.outfit.red": "SUNSET RED",
    "profile.outfit.purple": "ROYAL PURPLE",

    "market.title": "VILLAGE MARKET",
    "market.stallName": "VILLAGE MARKET",
    "market.welcome": "Welcome to the village market!",
    "market.buy": "1  ·  BUY 5 RICE SEEDS  ·  10 COINS",
    "market.sell": "2  ·  SELL ALL RICE  ·  5 COINS EACH",
    "market.notEnough": "Not enough coins!",
    "market.noRice": "You have no rice to sell!",
    "market.bought": "You bought 5 rice seeds!",
    "market.sold": "Sold {rice} rice for {coins} coins!",
    "market.exitHint": "E OR RED × TO EXIT",
    "market.prompt": "PRESS E TO VISIT MARKET",
    "market.clickHint": "CLICK A CARD OR PRESS 1 / 2 / 3 / 4 / 5",
    "market.buyRod": "3  ·  BUY A FISHING ROD  ·  35 COINS",
    "market.rodOwned": "3  ·  FISHING ROD ALREADY OWNED",
    "market.rodPurchased": "Fishing rod purchased! Visit the riverbank to fish.",
    "market.sellMeals": "4  ·  SELL ALL COOKED MEALS",
    "market.sellFish": "5  ·  SELL ALL FISH  ·  BARB 4 / CATFISH 6 / CARP 8",
    "market.noFish": "You have no fish to sell!",
    "market.fishSold": "Sold {fish} fish for {coins} coins!",
    "market.noMeals": "You have no cooked meals to sell!",
    "market.mealsSold": "Sold {meals} meals for {coins} coins!",

    "inventory.title": "PLAYER BACKPACK",
    "inventory.resources": "RESOURCES & GOODS",
    "inventory.seeds": "Rice Seeds",
    "inventory.rice": "Harvested Rice",
    "inventory.fish": "River Fish",
    "inventory.meals": "Cooked Meals",
    "inventory.rod": "Fishing Rod",
    "inventory.owned": "Owned",
    "inventory.notOwned": "Not owned",
    "inventory.fishVariety": "Fish varieties",
    "inventory.fishVarietyValue": "B:{barb} · C:{catfish} · G:{carp}",
    "inventory.equipment": "FARMING TOOLS",
    "inventory.instructions": "Click a tool or press 1–4 to equip it.",
    "inventory.quantity": "Qty: {amount}",

    "board.title": "VILLAGE REQUEST BOARD",
    "board.subtitle": "Help your neighbours and earn useful farming supplies.",
    "board.label": "VILLAGE REQUESTS",
    "board.prompt": "PRESS R TO VIEW REQUESTS",
    "board.request": "DELIVER {amount} RICE",
    "board.reward": "REWARD: {coins} COINS  +  {seeds} SEEDS",
    "board.progress": "YOUR RICE: {current} / {required}",
    "board.completed": "TODAY'S REQUEST COMPLETE. THANK YOU!",
    "board.notEnough": "You need {amount} rice. You have {current}.",
    "board.thankYou": "Delivery accepted! +{coins} coins and +{seeds} seeds.",
    "board.deliverButton": "1  ·  CLICK TO DELIVER RICE",
    "board.doneButton": "REQUEST COMPLETED",
    "board.exitHint": "R OR RED × TO EXIT",

    "farm.day": "DAY {day} - FARM",
    "farm.seeds": "RICE SEEDS: {seeds}   RICE: {rice}",
    "farm.tools": "1 HOE  2 SEEDS  3 WATER  4 HARVEST",
    "farm.findPlot": "Choose a tool, stand by a plot, then press SPACE.",
    "farm.prepared": "Soil prepared! Plant rice now.",
    "farm.alreadyPrepared": "This soil is already prepared!",
    "farm.needSoil": "Prepare the soil with your hoe first!",
    "farm.alreadyPlanted": "Something is already growing here!",
    "farm.noSeeds": "You don't have any rice seeds!",
    "farm.planted": "Rice seeds planted!",
    "farm.noCrop": "There are no crops to water here!",
    "farm.ready": "This rice is ready to harvest!",
    "farm.watered": "This crop is already watered today!",
    "farm.waterSuccess": "Rice crop watered!",
    "farm.notReady": "This rice isn't ready yet!",
    "farm.harvested": "Harvest complete! +3 rice.",
    "farm.newDay": "A new day! {grown} crops grew; {wilted} crops missed watering.",
    "farm.deadCrop": "This crop has died. Clear it with the sickle.",
    "farm.deadHarvested": "Dead crop cleared. No rice was collected.",
    "farm.noTile": "Move closer to a farm plot!",
    "farm.selected": "Selected tool: {tool}",
    "farm.hoe": "HOE",
    "farm.seedTool": "SEEDS",
    "farm.water": "WATER",
    "farm.harvest": "HARVEST",

    "fishing.castHint": "F · CAST LINE",
    "fishing.needRod": "BUY A FISHING ROD AT THE MARKET",
    "fishing.waiting": "WAIT FOR A BITE...",
    "fishing.bite": "A BITE! PRESS SPACE TO REEL IN",
    "fishing.missed": "The fish got away. Try again!",
    "fishing.rodPurchased": "Fishing rod added to your backpack!",
    "fishing.caught.silverBarb": "Caught a Silver Barb!",
    "fishing.caught.catfish": "Caught a River Catfish!",
    "fishing.caught.goldenCarp": "Caught a Golden Carp!",

    "cooking.title": "HOME COOKING HEARTH",
    "cooking.subtitle": "Combine river fish and your harvested rice to prepare village dishes.",
    "cooking.station": "HOME COOKING",
    "cooking.prompt": "E · COOK AT THE HEARTH",
    "cooking.owned": "made",
    "cooking.eatButton": "Q  ·  EAT ONE MEAL  ·  WELL-FED FISHING BONUS",
    "cooking.noMealToEat": "Cook a meal first, then you can eat it here.",
    "cooking.wellFed": "Meal enjoyed! Better fishing luck until the next day.",
    "cooking.ingredientSummary": "Rice: {rice}  ·  Fish: {fish}  (Barb {barb} / Catfish {catfish} / Carp {carp})",
    "cooking.needRice": "You need {amount} rice for this recipe.",
    "cooking.needFish": "You need at least one fish for this recipe.",
    "cooking.need.catfish": "You need a River Catfish for Mohinga.",
    "cooking.need.goldenCarp": "You need a Golden Carp for Fish Curry.",
    "cooking.cookFailed": "The recipe could not be prepared. Try again.",
    "cooking.cooked": "Prepared {meal}!",
    "cooking.recipe.fishRice": "FISH & RICE BOWL",
    "cooking.recipe.fishRiceDesc": "1 any fish + 2 rice · sells for 20 coins",
    "cooking.recipe.mohinga": "RIVER CATFISH MOHINGA",
    "cooking.recipe.mohingaDesc": "1 catfish + 3 rice · sells for 24 coins",
    "cooking.recipe.fishCurry": "GOLDEN CARP CURRY",
    "cooking.recipe.fishCurryDesc": "1 golden carp + 2 rice · sells for 20 coins",

    "npcFarm.sold": "{name} sold {amount} rice at the market",
    "village.maThiri": "Ma Thiri",
    "village.koAung": "Ko Aung",
    "village.maHome": "MA THIRI'S HOME",
    "village.koHome": "KO AUNG'S HOME",
    "village.talk": "PRESS E TO TALK",
    "village.breakfast": "Having breakfast",
    "village.market": "Visiting the market",
    "village.field": "Working near rice fields",
    "village.canal": "Resting by the canal",
    "village.home": "At home with family",
    "village.sleep": "Sleeping at home",
    "village.monk": "U Nanda",
    "village.kid": "Maung Nyi",
    "village.alms": "Walking the alms round",
    "village.offering": "Offering rice with care",
    "village.homage": "Paying respect",
    "village.sweeping": "Sweeping fallen leaves",
    "village.meditate": "Meditating by the pagoda",
    "village.walkMeditate": "Walking meditation",
    "village.monkMeal": "Taking the morning meal",
    "village.monkRest": "Resting in the monastery",
    "village.chant": "Evening chanting",
    "village.kidChase": "Chasing the chickens!",
    "village.kidPlay": "Running and playing",
    "village.kidSchool": "Learning at the monastery",
    "village.kidSkip": "Skipping stones at the canal",
    "village.lunch": "Having lunch at home",

    "dialogue.monk.0": "Mingalaba, child. May you be well and happy.",
    "dialogue.monk.1": "I sweep the monastery grounds each morning. A clean place helps a calm mind.",
    "dialogue.monk.2": "At dawn the villagers offer rice, and we share what we receive with those in need.",
    "dialogue.monk.3": "A farmer and a monk are alike: both plant good seeds and wait with patience.",
    "dialogue.monk.4": "When the mind wanders, walk slowly and watch each step. The path will teach you.",
    "dialogue.monk.5": "Be kind to the land and to your neighbours. May your harvest be plentiful.",

    "dialogue.kid.0": "Hi hi! Did you see my chicken chase? They are so fast!",
    "dialogue.kid.1": "Ma Thiri says I must not tease the chickens, but it is the best game!",
    "dialogue.kid.2": "I learn my letters at the monastery. The Sayadaw is very kind.",
    "dialogue.kid.3": "Look! The water buffalo is taking a mud bath again. He loves it!",
    "dialogue.kid.4": "When I grow up I will grow the biggest rice in the whole village.",
    "dialogue.kid.5": "Race you to the canal! Ready... go!",

    "ambient.ma.0": "The morning air is lovely today.",
    "ambient.ma.1": "I hope your rice field is doing well.",
    "ambient.ma.2": "The market has fresh goods this morning.",
    "ambient.ma.3": "Please enjoy your time in our village.",
    "ambient.ko.0": "Good soil and patience make a fine harvest.",
    "ambient.ko.1": "The paddy needs a little more water today.",
    "ambient.ko.2": "Have you seen the buffalo by the fields?",
    "ambient.ko.3": "A good harvest is better when shared.",
    "ambient.monk.0": "May your day be peaceful and kind.",
    "ambient.monk.1": "Take each step with care, my friend.",
    "ambient.monk.2": "Generosity brings warmth to the whole village.",
    "ambient.monk.3": "May your work bear good fruit.",
    "ambient.kid.0": "Have you seen the chickens? They are quick!",
    "ambient.kid.1": "I want to grow the biggest rice in the village!",
    "ambient.kid.2": "Come play by the canal with me!",
    "ambient.kid.3": "The buffalo is my favourite neighbour!",

    "hud.hint": "WASD MOVE · E TALK",
    "hud.cropDay": "CROP DAY {day}",
    "hud.tip.help": "Help",
    "hud.tip.language": "Language",
    "hud.tip.fullscreen": "Fullscreen",
    "hud.tip.music": "All sound",
    "hud.tip.profile": "Player profile",
    "hud.tip.inventory": "Inventory / Backpack",


    "world.bambooGrove": "BAMBOO GROVE",
    "world.monastery": "VILLAGE MONASTERY",
    "world.lotusPond": "LOTUS POND",

    "dialogue.ma.0": "Mingalaba! Welcome to our village.",
    "dialogue.ma.1": "My name is Ma Thiri. I live here with my family.",
    "dialogue.ma.2": "I work in my rice field in the morning, then take the harvest to market.",
    "dialogue.ma.3": "During the afternoon, I help around the rice fields.",
    "dialogue.ma.4": "In the evening, I return home to rest.",
    "dialogue.ma.5": "I hope you enjoy your stay. Mingalaba!",
    "dialogue.ko.0": "Mingalaba! How are you today?",
    "dialogue.ko.1": "My name is Ko Aung. I am a farmer.",
    "dialogue.ko.2": "I spend most mornings working in the rice fields.",
    "dialogue.ko.3": "Good rice needs patience, hard work, and water.",
    "dialogue.ko.4": "Sometimes I visit the market to buy supplies.",
    "dialogue.ko.5": "Take care of your crops, friend!",

    "save.saving": "SAVING...",
    "save.load": "LOADING",
    "save.saveButton": "SAVE",
    "save.loadButton": "LOAD",
    "save.auto": "AUTO-SAVED"
  },

  my: {
    "common.close": "ပိတ်မည်",
    "common.clickCrossExit": "အနီရောင် × ကိုနှိပ်၍ ပိတ်ပါ",
    "common.language": "ဘာသာစကား",
    "common.english": "အင်္ဂလိပ်",
    "common.myanmar": "မြန်မာ",
    "common.saved": "ဂိမ်းကို သိမ်းဆည်းပြီးပါပြီ!",
    "common.loaded": "ဂိမ်းကို ပြန်ဖွင့်ပြီးပါပြီ!",
    "common.noSave": "သိမ်းဆည်းထားသော ဂိမ်းမရှိသေးပါ",
    "common.saveFailed": "သိမ်းဆည်းမှု မအောင်မြင်ပါ!",
    "common.loadFailed": "ပြန်ဖွင့်မှု မအောင်မြင်ပါ!",

    "help.title": "ကစားနည်း လမ်းညွှန်",
    "help.subtitle": "အရေးကြီးသော ထိန်းချုပ်မှုများကို ပုံနှင့်တကွ ကြည့်ပါ။",
    "help.moveTitle": "ရွှေ့လျားရန်",
    "help.moveBody": "W A S D / မြှားခလုတ်များ\nကိရိယာ: 1–4",
    "help.villageTitle": "ရွာတွင်း လုပ်ဆောင်ချက်",
    "help.villageBody": "E: စကားပြော / ဈေးဝယ်\nR: နေ့စဉ်တောင်းဆိုမှု\nSPACE: ကိရိယာသုံး",
    "help.farmTitle": "စပါး စိုက်ပျိုးရန်",
    "help.farmBody": "မြေပြင် → မျိုးစေ့ → နေ့စဉ်ရေ\n၄ ရက် ရေလောင်းပြီး ရိတ်သိမ်းပါ",
    "help.fishingTitle": "ငါးမျှားရန်",
    "help.fishingBody": "ဈေးတွင် ငါးမျှားတံဝယ်ပါ\nF ဖြင့်ချ · SPACE ဖြင့်ဆွဲပါ\nအချိန်အလိုက် ငါးကွဲပြားသည်",
    "help.cookingTitle": "အိမ်တွင် ချက်ပြုတ်ရန်",
    "help.cookingBody": "E ဖြင့် ချက်ပါ · 1–3 ဟင်းချက်ရန်\nQ ဖြင့် ဟင်းစားပါ",
    "help.houseTitle": "သင့်အိမ်",
    "help.houseBody": "E နှိပ်၍ အိမ်ထဲဝင်ပါ\nအိပ်ရာ · သေတ္တာ · မီးဖို · ESC ထွက်ရန်",

    "house.title": "ကျွန်ုပ်၏အိမ်",
    "house.bed": "အိပ်ရာ",
    "house.chest": "ပစ္စည်းသေတ္တာ",
    "house.cooker": "မီးဖို",
    "house.enterPrompt": "E · အိမ်ထဲသို့ ဝင်ရန်",
    "house.controls": "WASD / မြှားဖြင့် ရွှေ့ပါ · E အသုံးပြု · ESC ထွက်ရန်",
    "house.useBed": "အိပ်ရန်",
    "house.openChest": "သေတ္တာဖွင့်ရန်",
    "house.useCooker": "ချက်ပြုတ်ရန်",
    "house.exitDoor": "အိမ်မှ ထွက်ရန်",
    "house.welcome": "အနားယူရန်၊ ပစ္စည်းသိမ်းရန်နှင့် ချက်ပြုတ်ရန် နေရာလေးပါ။",
    "house.sleeping": "အနားယူနေသည်...",
    "house.woke": "နိုးလာချိန် {time} · နေ့ {day}",

    "chest.title": "အိမ်သုံးပစ္စည်းသေတ္တာ",
    "chest.bag": "ကျောပိုးအိတ်",
    "chest.chest": "သေတ္တာ",
    "chest.subtitle": "ကျောပိုးအိတ်နှင့် သေတ္တာကြား ပစ္စည်းများ ရွှေ့ပါ။",
    "chest.seeds": "စပါးမျိုးစေ့",
    "chest.rice": "ရိတ်သိမ်းထားသော စပါး",
    "chest.silverBarb": "ငါးမြစ်ချောင်း",
    "chest.catfish": "ငါးခူ",
    "chest.goldenCarp": "ရွှေရောင်ငါးကြင်း",
    "chest.fishRice": "ငါးနှင့်ထမင်း",
    "chest.mohinga": "မုန့်ဟင်းခါး",
    "chest.fishCurry": "ရွှေရောင်ငါးကြင်းဟင်း",
    "chest.put": "သိမ်းရန်",
    "chest.take": "ထုတ်ရန်",
    "chest.stored": "ပစ္စည်း {amount} ခု သိမ်းပြီးပါပြီ။",
    "chest.taken": "ပစ္စည်း {amount} ခု ကျောပိုးအိတ်ထဲသို့ ရွှေ့ပြီးပါပြီ။",
    "chest.nothingToStore": "သိမ်းရန် ဤပစ္စည်း မရှိပါ။",
    "chest.empty": "သေတ္တာထဲတွင် ဤပစ္စည်း မရှိပါ။",

    "profile.title": "ကစားသမား အချက်အလက်",
    "profile.name": "ကစားသမားအမည်: {name}",
    "profile.rename": "အမည်ပြောင်းရန်",
    "profile.outfit": "အင်္ကျီအရောင် ရွေးချယ်ပါ",
    "profile.close": "အင်္ကျီရွေးပါ သို့မဟုတ် အမည်ပြောင်းပါ။",
    "profile.defaultName": "လယ်သမား",
    "profile.outfit.green": "စိမ်းလန်းသောရွာ",
    "profile.outfit.blue": "မြစ်ပြာရောင်",
    "profile.outfit.red": "နေဝင်ချိန်အနီ",
    "profile.outfit.purple": "ခရမ်းရောင်",

    "market.title": "ရွာဈေး",
    "market.stallName": "ရွာဈေး",
    "market.welcome": "ရွာဈေးမှ ကြိုဆိုပါတယ်!",
    "market.buy": "1 · စပါးမျိုးစေ့ ၅ ထုပ် ဝယ်ရန် · ဒင်္ဂါး ၁၀",
    "market.sell": "2 · စပါးအားလုံး ရောင်းရန် · တစ်ခုလျှင် ဒင်္ဂါး ၅",
    "market.notEnough": "ဒင်္ဂါး မလုံလောက်ပါ!",
    "market.noRice": "ရောင်းရန် စပါးမရှိပါ!",
    "market.bought": "စပါးမျိုးစေ့ ၅ ထုပ် ဝယ်ယူပြီးပါပြီ!",
    "market.sold": "စပါး {rice} ခုကို ဒင်္ဂါး {coins} ဖြင့် ရောင်းပြီးပါပြီ!",
    "market.exitHint": "E သို့မဟုတ် အနီရောင် × ဖြင့် ပိတ်ပါ",
    "market.prompt": "E နှိပ်၍ ဈေးသို့ သွားပါ",
    "market.clickHint": "ကတ်ကို နှိပ်ပါ သို့မဟုတ် 1 / 2 / 3 / 4 / 5 နှိပ်ပါ",
    "market.buyRod": "3 · ငါးမျှားတံ ဝယ်ရန် · ဒင်္ဂါး ၃၅",
    "market.rodOwned": "3 · ငါးမျှားတံ ပိုင်ဆိုင်ပြီးပါပြီ",
    "market.rodPurchased": "ငါးမျှားတံ ဝယ်ယူပြီးပါပြီ။ မြစ်ကမ်းသို့ သွားပါ။",
    "market.sellMeals": "4 · ချက်ပြီးသော ဟင်းအားလုံး ရောင်းရန်",
    "market.sellFish": "5 · ငါးအားလုံး ရောင်းရန် · မြစ် ၄ / ခူ ၆ / ကြင်း ၈",
    "market.noFish": "ရောင်းရန် ငါးမရှိပါ။",
    "market.fishSold": "ငါး {fish} ကောင်ကို ဒင်္ဂါး {coins} ဖြင့် ရောင်းပြီးပါပြီ။",
    "market.noMeals": "ရောင်းရန် ချက်ပြီးသော ဟင်းမရှိပါ။",
    "market.mealsSold": "ဟင်း {meals} ပွဲကို ဒင်္ဂါး {coins} ဖြင့် ရောင်းပြီးပါပြီ။",

    "inventory.title": "ကျောပိုးအိတ်",
    "inventory.resources": "ပစ္စည်းများနှင့် ကုန်ပစ္စည်းများ",
    "inventory.seeds": "စပါးမျိုးစေ့",
    "inventory.rice": "ရိတ်သိမ်းထားသော စပါး",
    "inventory.fish": "မြစ်ငါး",
    "inventory.meals": "ချက်ပြီးသော ဟင်း",
    "inventory.rod": "ငါးမျှားတံ",
    "inventory.owned": "ရှိသည်",
    "inventory.notOwned": "မရှိသေးပါ",
    "inventory.fishVariety": "ငါးအမျိုးအစားများ",
    "inventory.fishVarietyValue": "မြစ်:{barb} · ခူ:{catfish} · ကြင်း:{carp}",
    "inventory.equipment": "လယ်ယာသုံး ကိရိယာများ",
    "inventory.instructions": "ကိရိယာကို နှိပ်ပါ သို့မဟုတ် 1–4 နှိပ်၍ ရွေးပါ။",
    "inventory.quantity": "အရေအတွက်: {amount}",

    "board.title": "ရွာ့တောင်းဆိုမှု ဘုတ်အဖွဲ့",
    "board.subtitle": "အိမ်နီးချင်းတွေကို ကူညီပြီး စိုက်ပျိုးရေးပစ္စည်းတွေ ရယူပါ။",
    "board.label": "ရွာ့တောင်းဆိုမှုများ",
    "board.prompt": "R နှိပ်၍ တောင်းဆိုမှုများ ကြည့်ပါ",
    "board.request": "စပါး {amount} ခု ပို့ပေးပါ",
    "board.reward": "ဆု: ဒင်္ဂါး {coins}  +  မျိုးစေ့ {seeds}",
    "board.progress": "သင့်စပါး: {current} / {required}",
    "board.completed": "ယနေ့တောင်းဆိုမှု ပြီးပါပြီ။ ကျေးဇူးတင်ပါတယ်!",
    "board.notEnough": "စပါး {amount} ခု လိုအပ်ပါတယ်။ သင့်မှာ {current} ခု ရှိပါတယ်။",
    "board.thankYou": "ပို့ဆောင်မှု လက်ခံရရှိပါပြီ! ဒင်္ဂါး {coins} နှင့် မျိုးစေ့ {seeds} ရရှိပါတယ်။",
    "board.deliverButton": "1  ·  နှိပ်၍ စပါး ပို့ပေးရန်",
    "board.doneButton": "တောင်းဆိုမှု ပြီးပါပြီ",
    "board.exitHint": "R သို့မဟုတ် အနီရောင် × ဖြင့် ပိတ်ပါ",

    "farm.day": "နေ့ {day} - လယ်ယာ",
    "farm.seeds": "စပါးမျိုးစေ့: {seeds}   စပါး: {rice}",
    "farm.tools": "1 ပေါက်တူး  2 မျိုးစေ့  3 ရေလောင်း  4 ရိတ်သိမ်း",
    "farm.findPlot": "ကိရိယာရွေးပြီး စိုက်ခင်းအနီးတွင် SPACE နှိပ်ပါ။",
    "farm.prepared": "မြေဆီလွှာ ပြင်ဆင်ပြီးပါပြီ။ မျိုးစေ့ စိုက်နိုင်ပါပြီ။",
    "farm.alreadyPrepared": "ဒီမြေကို ပြင်ဆင်ပြီးသားပါ!",
    "farm.needSoil": "မျိုးစေ့မစိုက်ခင် မြေကို ပေါက်တူးဖြင့် ပြင်ဆင်ပါ!",
    "farm.alreadyPlanted": "ဒီနေရာမှာ အပင် စိုက်ထားပြီးသားပါ!",
    "farm.noSeeds": "စပါးမျိုးစေ့ မရှိတော့ပါ!",
    "farm.planted": "စပါးမျိုးစေ့ စိုက်ပြီးပါပြီ!",
    "farm.noCrop": "ဒီနေရာမှာ ရေလောင်းရန် အပင်မရှိပါ!",
    "farm.ready": "စပါး ရိတ်သိမ်းရန် အသင့်ဖြစ်ပါပြီ!",
    "farm.watered": "ဒီနေ့ ရေလောင်းပြီးသားပါ!",
    "farm.waterSuccess": "စပါးပင်ကို ရေလောင်းပြီးပါပြီ!",
    "farm.notReady": "စပါး မရင့်သေးပါ!",
    "farm.harvested": "ရိတ်သိမ်းပြီးပါပြီ! စပါး ၃ ခု ရရှိပါတယ်။",
    "farm.newDay": "နေ့သစ်ရောက်ပါပြီ! အပင် {grown} ပင် ကြီးထွားပြီး {wilted} ပင် ရေမလောင်းထားပါ။",
    "farm.deadCrop": "ဤအပင် သေဆုံးသွားပါပြီ။ တံစဉ်ဖြင့် ရှင်းလင်းပါ။",
    "farm.deadHarvested": "သေဆုံးသွားသော အပင်ကို ရှင်းလင်းပြီးပါပြီ။ စပါး မရရှိပါ။",
    "farm.noTile": "စိုက်ခင်းနားသို့ ပိုမိုနီးကပ်စွာ သွားပါ!",
    "farm.selected": "ရွေးထားသော ကိရိယာ: {tool}",
    "farm.hoe": "ပေါက်တူး",
    "farm.seedTool": "မျိုးစေ့",
    "farm.water": "ရေလောင်း",
    "farm.harvest": "ရိတ်သိမ်း",

    "fishing.castHint": "F · ငါးမျှားတံ ချပါ",
    "fishing.needRod": "ဈေးတွင် ငါးမျှားတံ ဝယ်ယူပါ",
    "fishing.waiting": "ငါးကို စောင့်နေသည်...",
    "fishing.bite": "ငါးဟပ်ပြီ! SPACE နှိပ်၍ ဆွဲတင်ပါ",
    "fishing.missed": "ငါး လွတ်သွားပါပြီ။ ထပ်ကြိုးစားပါ။",
    "fishing.rodPurchased": "ငါးမျှားတံကို ကျောပိုးအိတ်ထဲ ထည့်ပြီးပါပြီ။",
    "fishing.caught.silverBarb": "ငါးမြစ်ချောင်း တစ်ကောင် ရရှိပါပြီ!",
    "fishing.caught.catfish": "ငါးခူ တစ်ကောင် ရရှိပါပြီ!",
    "fishing.caught.goldenCarp": "ရွှေရောင်ငါးကြင်း တစ်ကောင် ရရှိပါပြီ!",

    "cooking.title": "အိမ်ချက်မီးဖို",
    "cooking.subtitle": "မြစ်ငါးနှင့် ရိတ်သိမ်းထားသော စပါးကို ပေါင်းစပ်ချက်ပြုတ်ပါ။",
    "cooking.station": "အိမ်ချက်မီးဖို",
    "cooking.prompt": "E · မီးဖိုတွင် ချက်ပြုတ်ပါ",
    "cooking.owned": "ပွဲ",
    "cooking.eatButton": "Q · ဟင်းတစ်ပွဲ စားပါ · ငါးမျှားကံကောင်းမှု",
    "cooking.noMealToEat": "စားရန် ဟင်းကို အရင်ချက်ပြုတ်ပါ။",
    "cooking.wellFed": "ဟင်းစားပြီးပါပြီ။ နောက်နေ့အထိ ငါးမျှားကံကောင်းမှု ရရှိပါမည်။",
    "cooking.ingredientSummary": "စပါး {rice} · ငါး {fish} (ငါးမြစ်ချောင်း {barb} / ငါးခူ {catfish} / ငါးကြင်း {carp})",
    "cooking.needRice": "ဤဟင်းချက်ရန် စပါး {amount} လိုအပ်ပါသည်။",
    "cooking.needFish": "ဤဟင်းချက်ရန် ငါးတစ်ကောင် လိုအပ်ပါသည်။",
    "cooking.need.catfish": "မုန့်ဟင်းခါးအတွက် ငါးခူ လိုအပ်ပါသည်။",
    "cooking.need.goldenCarp": "ငါးဟင်းအတွက် ရွှေရောင်ငါးကြင်း လိုအပ်ပါသည်။",
    "cooking.cookFailed": "ချက်ပြုတ်မရပါ။ ထပ်ကြိုးစားပါ။",
    "cooking.cooked": "{meal} ချက်ပြုတ်ပြီးပါပြီ။",
    "cooking.recipe.fishRice": "ငါးနှင့် ထမင်းပန်းကန်",
    "cooking.recipe.fishRiceDesc": "ငါး ၁ + စပါး ၂ · ဒင်္ဂါး ၂၀ ဖြင့် ရောင်းနိုင်သည်",
    "cooking.recipe.mohinga": "ငါးခူ မုန့်ဟင်းခါး",
    "cooking.recipe.mohingaDesc": "ငါးခူ ၁ + စပါး ၃ · ဒင်္ဂါး ၂၄ ဖြင့် ရောင်းနိုင်သည်",
    "cooking.recipe.fishCurry": "ရွှေရောင်ငါးကြင်းဟင်း",
    "cooking.recipe.fishCurryDesc": "ငါးကြင်း ၁ + စပါး ၂ · ဒင်္ဂါး ၂၀ ဖြင့် ရောင်းနိုင်သည်",

    "npcFarm.sold": "{name} သည် စပါး {amount} ကို ဈေးတွင် ရောင်းချပြီးပါပြီ",
    "village.maThiri": "မသီရိ",
    "village.koAung": "ကိုအောင်",
    "village.maHome": "မသီရိ၏အိမ်",
    "village.koHome": "ကိုအောင်၏အိမ်",
    "village.talk": "E နှိပ်၍ စကားပြောပါ",
    "village.breakfast": "နံနက်စာ စားနေသည်",
    "village.market": "ဈေးသို့ သွားနေသည်",
    "village.field": "စပါးခင်းတွင် အလုပ်လုပ်နေသည်",
    "village.canal": "တူးမြောင်းအနီး အနားယူနေသည်",
    "village.home": "မိသားစုနှင့် အိမ်တွင် ရှိနေသည်",
    "village.sleep": "အိမ်တွင် အိပ်နေသည်",
    "village.monk": "ဦးနန္ဒ",
    "village.kid": "မောင်ညီ",
    "village.alms": "ဆွမ်းခံ လှည့်လည်နေသည်",
    "village.offering": "ရိုသေစွာ ဆွမ်းကပ်လှူနေသည်",
    "village.homage": "ရိုသေစွာ ဦးချကန်တော့နေသည်",
    "village.sweeping": "ကျောင်းဝင်းရှိ ရွက်ခြောက်များ လှည်းနေသည်",
    "village.meditate": "ဘုရားရင်ပြင်တွင် တရားထိုင်နေသည်",
    "village.walkMeditate": "စင်္ကြံလျှောက်နေသည်",
    "village.monkMeal": "နံနက်ဆွမ်း ဘုန်းပေးနေသည်",
    "village.monkRest": "ကျောင်းတွင် အနားယူနေသည်",
    "village.chant": "ညနေ ပရိတ်ရွတ်နေသည်",
    "village.kidChase": "ကြက်တွေကို လိုက်ဖမ်းနေတယ်!",
    "village.kidPlay": "ပြေးလွှားကစားနေတယ်",
    "village.kidSchool": "ကျောင်းတွင် စာသင်နေတယ်",
    "village.kidSkip": "တူးမြောင်းနားတွင် ကျောက်စရစ် ကစားနေတယ်",
    "village.lunch": "အိမ်တွင် နေ့လယ်စာ စားနေတယ်",

    "dialogue.monk.0": "မင်္ဂလာပါ သားရေ။ ကျန်းမာချမ်းသာပါစေ။",
    "dialogue.monk.1": "နေ့တိုင်း နံနက်ကျောင်းဝင်းကို လှည်းပါတယ်။ သန့်ရှင်းတဲ့နေရာက စိတ်ကို ငြိမ်းချမ်းစေတယ်။",
    "dialogue.monk.2": "မိုးမလင်းခင် ရွာသားတွေ ဆွမ်းလောင်းကြပြီး ရတာကို လိုအပ်သူတွေနဲ့ မျှဝေပါတယ်။",
    "dialogue.monk.3": "လယ်သမားနဲ့ ရဟန်းဟာ ဆင်တူပါတယ်။ ကောင်းတဲ့မျိုးစေ့ကို စိုက်ပြီး သည်းခံစောင့်ရတာပါပဲ။",
    "dialogue.monk.4": "စိတ်လွင့်ရင် ဖြည်းဖြည်းလျှောက်ပြီး ခြေလှမ်းတိုင်းကို သတိထားပါ။ လမ်းက သင်ပေးပါလိမ့်မယ်။",
    "dialogue.monk.5": "မြေကိုရော အိမ်နီးချင်းတွေကိုပါ ကြင်နာပါ။ သင့်ရိတ်သိမ်းမှု ပေါများပါစေ။",

    "dialogue.kid.0": "ဟိုင်း! ကျွန်တော် ကြက်လိုက်ဖမ်းတာ မြင်လား? သူတို့ အရမ်းမြန်တယ်!",
    "dialogue.kid.1": "မသီရိက ကြက်တွေကို မစနဲ့ဆိုပေမယ့် ဒါက အကောင်းဆုံးဂိမ်းပဲ!",
    "dialogue.kid.2": "ကျွန်တော် ကျောင်းမှာ စာသင်တယ်။ ဆရာတော်က အရမ်းကြင်နာတယ်။",
    "dialogue.kid.3": "ကြည့်! ကျွဲက ရွှံ့ထဲမှာ ထပ်ပြီး ရေချိုးနေပြန်ပြီ။ သူ အရမ်းကြိုက်တယ်!",
    "dialogue.kid.4": "ကျွန်တော် ကြီးရင် ရွာတစ်ရွာလုံးမှာ အကြီးဆုံး စပါးစိုက်မယ်။",
    "dialogue.kid.5": "တူးမြောင်းအထိ အပြေးပြိုင်ကြမယ်! အဆင်သင့်... ပြေး!",

    "ambient.ma.0": "ဒီနေ့ မနက်လေက အရမ်းသာယာပါတယ်။",
    "ambient.ma.1": "သင့်စပါးခင်း ကောင်းကောင်းကြီးထွားပါစေ။",
    "ambient.ma.2": "ဒီမနက် ဈေးမှာ ပစ္စည်းသစ်တွေ ရှိပါတယ်။",
    "ambient.ma.3": "ကျွန်မတို့ရွာမှာ ပျော်ရွှင်ပါစေ။",
    "ambient.ko.0": "မြေဆီကောင်းပြီး သည်းခံရင် စပါးကောင်းရပါတယ်။",
    "ambient.ko.1": "ဒီနေ့ စပါးခင်းကို ရေနည်းနည်း ထပ်လောင်းရမယ်။",
    "ambient.ko.2": "လယ်ကွင်းနားက ကျွဲကို တွေ့ပြီးပြီလား။",
    "ambient.ko.3": "ရိတ်သိမ်းမှုကို မျှဝေရင် ပိုကောင်းပါတယ်။",
    "ambient.monk.0": "သင့်နေ့ရက် ငြိမ်းချမ်းပြီး ကြင်နာမှုရှိပါစေ။",
    "ambient.monk.1": "ခြေလှမ်းတိုင်းကို သတိဖြင့် လှမ်းပါ မိတ်ဆွေ။",
    "ambient.monk.2": "စေတနာက ရွာတစ်ရွာလုံးကို နွေးထွေးစေပါတယ်။",
    "ambient.monk.3": "သင့်ကြိုးစားမှု အကျိုးရလဒ်ကောင်း ရပါစေ။",
    "ambient.kid.0": "ကြက်တွေကို တွေ့ပြီးပြီလား? သူတို့ အရမ်းမြန်တယ်!",
    "ambient.kid.1": "ရွာမှာ အကြီးဆုံးစပါးကို ကျွန်တော် စိုက်ချင်တယ်!",
    "ambient.kid.2": "တူးမြောင်းနားမှာ ကျွန်တော်နဲ့ ကစားပါဦး!",
    "ambient.kid.3": "ကျွဲက ကျွန်တော် အကြိုက်ဆုံး အိမ်နီးချင်းပဲ!",

    "hud.hint": "WASD သွားရန် · E ပြောရန်",
    "hud.cropDay": "စိုက်ပျိုးနေ့ {day}",
    "hud.tip.help": "အကူအညီ",
    "hud.tip.language": "ဘာသာစကား",
    "hud.tip.fullscreen": "မျက်နှာပြင်အပြည့်",
    "hud.tip.music": "အသံအားလုံး",
    "hud.tip.profile": "ကစားသမား အချက်အလက်",
    "hud.tip.inventory": "ကျောပိုးအိတ် / ပစ္စည်းများ",


    "world.bambooGrove": "ဝါးတော",
    "world.monastery": "ဘုန်းကြီးကျောင်း",
    "world.lotusPond": "ကြာကန်",

    "dialogue.ma.0": "မင်္ဂလာပါ! ကျွန်မတို့ရွာမှ ကြိုဆိုပါတယ်။",
    "dialogue.ma.1": "ကျွန်မနာမည် မသီရိပါ။ မိသားစုနဲ့ ဒီရွာမှာ နေပါတယ်။",
    "dialogue.ma.2": "မနက်ခင်းမှာ စပါးခင်းအလုပ်လုပ်ပြီး နေ့လယ်မှာ ဈေးသို့ သီးနှံသွားရောင်းပါတယ်။",
    "dialogue.ma.3": "နေ့လယ်ပိုင်းမှာ စပါးခင်းအလုပ် ကူလုပ်ပေးပါတယ်။",
    "dialogue.ma.4": "ညနေပိုင်းမှာ အိမ်ပြန်ပြီး အနားယူပါတယ်။",
    "dialogue.ma.5": "ဒီရွာမှာ ပျော်ရွှင်စွာ နေထိုင်နိုင်ပါစေ။ မင်္ဂလာပါ!",
    "dialogue.ko.0": "မင်္ဂလာပါ! ဒီနေ့ နေကောင်းရဲ့လား။",
    "dialogue.ko.1": "ကျွန်တော့်နာမည် ကိုအောင်ပါ။ ကျွန်တော် လယ်သမားတစ်ယောက်ပါ။",
    "dialogue.ko.2": "မနက်ခင်းအများစုမှာ စပါးခင်းမှာ အလုပ်လုပ်ပါတယ်။",
    "dialogue.ko.3": "စပါးကောင်းဖို့ စိတ်ရှည်မှု၊ ကြိုးစားမှုနဲ့ ရေ လိုအပ်ပါတယ်။",
    "dialogue.ko.4": "တစ်ခါတစ်ရံ လယ်ယာသုံးပစ္စည်းတွေ ဝယ်ဖို့ ဈေးသွားပါတယ်။",
    "dialogue.ko.5": "သင့်စိုက်ခင်းကို ဂရုစိုက်ပါ မိတ်ဆွေ!",

    "save.saving": "သိမ်းဆည်းနေသည်...",
    "save.load": "ပြန်ဖွင့်နေသည်",
    "save.saveButton": "သိမ်းရန်",
    "save.loadButton": "ပြန်ဖွင့်ရန်",
    "save.auto": "အလိုအလျောက် သိမ်းပြီးပါပြီ"
  }
};

export class LanguageSystem {
  private language: Language = "my";
  private listeners: Array<() => void> = [];

  private storageKey = "fields_of_irrawaddy_language";

  constructor() {
    try {
      const saved = window.localStorage.getItem(this.storageKey);

      if (saved === "my" || saved === "en") {
        this.language = saved;
      }
    } catch {
      this.language = "my";
    }
  }

  getLanguage(): Language {
    return this.language;
  }

  getFontFamily(): string {
    // Noto Sans provides clean Latin text; Noto Sans Myanmar handles Burmese
    // shaping and glyphs. System fonts are retained as offline fallbacks.
    return this.language === "my"
      ? '"Noto Sans Myanmar", "Myanmar Text", "Leelawadee UI", sans-serif'
      : '"Noto Sans", "Segoe UI", Arial, sans-serif';
  }

  t(
    key: string,
    values: Record<string, string | number> = {}
  ): string {
    let result =
      translations[this.language][key] ??
      translations.en[key] ??
      key;

    for (const [name, value] of Object.entries(values)) {
      result = result.replace(
        new RegExp(`\\{${name}\\}`, "g"),
        String(value)
      );
    }

    return result;
  }

  setLanguage(language: Language): void {
    if (this.language === language) {
      return;
    }

    this.language = language;

    try {
      window.localStorage.setItem(
        this.storageKey,
        language
      );
    } catch {
      // Continue using the selected language for this session.
    }

    this.notify();
  }

  toggleLanguage(): void {
    this.setLanguage(
      this.language === "en" ? "my" : "en"
    );
  }

  onChange(callback: () => void): void {
    this.listeners.push(callback);
  }

  private notify(): void {
    for (const callback of this.listeners) {
      callback();
    }
  }
}

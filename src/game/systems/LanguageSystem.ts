
export type Language = "en" | "my";

type TranslationTable = Record<string, string>;

const translations: Record<Language, TranslationTable> = {
  en: {
    "common.close": "CLOSE",
    "common.language": "LANGUAGE",
    "common.english": "ENGLISH",
    "common.myanmar": "MYANMAR",
    "common.saved": "GAME SAVED!",
    "common.loaded": "GAME LOADED!",
    "common.noSave": "NO SAVE FOUND - NEW GAME",
    "common.saveFailed": "SAVE FAILED!",
    "common.loadFailed": "LOAD FAILED!",

    "profile.title": "FARMER PROFILE",
    "profile.name": "PLAYER NAME: {name}",
    "profile.rename": "RENAME",
    "profile.outfit": "CHOOSE YOUR SHIRT",
    "profile.close": "P OR ESC TO CLOSE",
    "profile.defaultName": "Farmer",
    "profile.outfit.green": "VILLAGE GREEN",
    "profile.outfit.blue": "RIVER BLUE",
    "profile.outfit.red": "SUNSET RED",
    "profile.outfit.purple": "ROYAL PURPLE",

    "market.title": "VILLAGE MARKET",
    "market.stallName": "VILLAGE MARKET",
    "market.welcome": "Welcome to the village market!",
    "market.buy": "1 - BUY 5 RICE SEEDS (10 COINS)",
    "market.sell": "2 - SELL ALL RICE (5 COINS EACH)",
    "market.notEnough": "Not enough coins!",
    "market.noRice": "You have no rice to sell!",
    "market.bought": "You bought 5 rice seeds!",
    "market.sold": "Sold {rice} rice for {coins} coins!",
    "market.close": "E OR ESC TO CLOSE",
    "market.prompt": "PRESS E TO VISIT MARKET",

    "inventory.title": "PLAYER BACKPACK",
    "inventory.resources": "YOUR RESOURCES",
    "inventory.wood": "Wood",
    "inventory.bamboo": "Bamboo",
    "inventory.herbs": "Herbs",
    "inventory.coconut": "Coconut",
    "inventory.seeds": "Rice Seeds",
    "inventory.rice": "Harvested Rice",
    "inventory.equipment": "FARMING TOOLS",
    "inventory.quantity": "Qty: {amount}",
    "inventory.close": "I OR ESC TO CLOSE",
    "inventory.prompt": "I - OPEN BACKPACK",
    "inventory.collect": "PRESS F TO COLLECT {item}",
    "inventory.collected": "COLLECTED {amount} {item}!",

    "craft.title": "VILLAGE WORKSHOP",
    "craft.workbenchName": "CRAFTING WORKBENCH",
    "craft.prompt": "PRESS C TO USE WORKSHOP",
    "craft.recipe1": "1 WOODEN FENCE - 3 WOOD",
    "craft.recipe2": "2 BAMBOO PLANTER - 2 BAMBOO + 1 HERB",
    "craft.recipe3": "3 VILLAGE SIGN - 2 WOOD + 1 BAMBOO",
    "craft.choose": "Choose a recipe using 1, 2, or 3.",
    "craft.noWood": "You need 3 wood.",
    "craft.noPlanter": "You need 2 bamboo and 1 herb.",
    "craft.noSign": "You need 2 wood and 1 bamboo.",
    "craft.fenceDone": "Wooden fence crafted!",
    "craft.planterDone": "Bamboo planter crafted!",
    "craft.signDone": "Village sign crafted!",
    "craft.fenceFull": "All fence spaces are full!",
    "craft.planterFull": "All planter spaces are full!",
    "craft.signFull": "You already built the village sign!",
    "craft.close": "C OR ESC TO CLOSE",

    "farm.day": "DAY {day} - FARM",
    "farm.seeds": "RICE SEEDS: {seeds}   RICE: {rice}",
    "farm.tools": "1 HOE  2 SEEDS  3 WATER  4 HARVEST",
    "farm.findPlot": "Find a farm plot and press SPACE.",
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
    "farm.newDay": "New day! {grown} crops grew.",
    "farm.noTile": "Move closer to a farm plot!",
    "farm.selected": "Selected tool: {tool}",
    "farm.hoe": "HOE",
    "farm.seedTool": "SEEDS",
    "farm.water": "WATER",
    "farm.harvest": "HARVEST",

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

    "world.bambooGrove": "BAMBOO GROVE",
    "world.monastery": "VILLAGE MONASTERY",
    "world.lotusPond": "LOTUS POND",

    "dialogue.ma.0": "Mingalaba! Welcome to our village.",
    "dialogue.ma.1": "My name is Ma Thiri. I live here with my family.",
    "dialogue.ma.2": "I usually visit the market in the morning.",
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
    "common.language": "ဘာသာစကား",
    "common.english": "အင်္ဂလိပ်",
    "common.myanmar": "မြန်မာ",
    "common.saved": "ဂိမ်းကို သိမ်းဆည်းပြီးပါပြီ!",
    "common.loaded": "ဂိမ်းကို ပြန်ဖွင့်ပြီးပါပြီ!",
    "common.noSave": "သိမ်းဆည်းထားသော ဂိမ်းမရှိသေးပါ",
    "common.saveFailed": "သိမ်းဆည်းမှု မအောင်မြင်ပါ!",
    "common.loadFailed": "ပြန်ဖွင့်မှု မအောင်မြင်ပါ!",

    "profile.title": "ကစားသမား အချက်အလက်",
    "profile.name": "ကစားသမားအမည်: {name}",
    "profile.rename": "အမည်ပြောင်းရန်",
    "profile.outfit": "အင်္ကျီအရောင် ရွေးချယ်ပါ",
    "profile.close": "P သို့မဟုတ် ESC နှိပ်၍ ပိတ်ပါ",
    "profile.defaultName": "လယ်သမား",
    "profile.outfit.green": "စိမ်းလန်းသောရွာ",
    "profile.outfit.blue": "မြစ်ပြာရောင်",
    "profile.outfit.red": "နေဝင်ချိန်အနီ",
    "profile.outfit.purple": "ခရမ်းရောင်",

    "market.title": "ရွာဈေး",
    "market.stallName": "ရွာဈေး",
    "market.welcome": "ရွာဈေးမှ ကြိုဆိုပါတယ်!",
    "market.buy": "1 - စပါးမျိုးစေ့ ၅ ထုပ် ဝယ်ရန် (ဒင်္ဂါး ၁၀)",
    "market.sell": "2 - စပါးအားလုံး ရောင်းရန် (တစ်ခုလျှင် ၅ ဒင်္ဂါး)",
    "market.notEnough": "ဒင်္ဂါး မလုံလောက်ပါ!",
    "market.noRice": "ရောင်းရန် စပါးမရှိပါ!",
    "market.bought": "စပါးမျိုးစေ့ ၅ ထုပ် ဝယ်ယူပြီးပါပြီ!",
    "market.sold": "စပါး {rice} ခုကို ဒင်္ဂါး {coins} ဖြင့် ရောင်းပြီးပါပြီ!",
    "market.close": "E သို့မဟုတ် ESC နှိပ်၍ ပိတ်ပါ",
    "market.prompt": "E နှိပ်၍ ဈေးသို့ သွားပါ",

    "inventory.title": "ကျောပိုးအိတ်",
    "inventory.resources": "သင်၏ ပစ္စည်းများ",
    "inventory.wood": "သစ်သား",
    "inventory.bamboo": "ဝါး",
    "inventory.herbs": "ဆေးဖက်ဝင်အပင်",
    "inventory.coconut": "အုန်းသီး",
    "inventory.seeds": "စပါးမျိုးစေ့",
    "inventory.rice": "ရိတ်သိမ်းထားသော စပါး",
    "inventory.equipment": "လယ်ယာသုံး ကိရိယာများ",
    "inventory.quantity": "အရေအတွက်: {amount}",
    "inventory.close": "I သို့မဟုတ် ESC နှိပ်၍ ပိတ်ပါ",
    "inventory.prompt": "I - ကျောပိုးအိတ် ဖွင့်ရန်",
    "inventory.collect": "F နှိပ်၍ {item} ကောက်ယူပါ",
    "inventory.collected": "{amount} ခု ကောက်ယူပြီးပါပြီ: {item}",

    "craft.title": "ရွာအလုပ်ရုံ",
    "craft.workbenchName": "အလုပ်ရုံ",
    "craft.prompt": "C နှိပ်၍ အလုပ်ရုံ အသုံးပြုပါ",
    "craft.recipe1": "1 သစ်သားခြံစည်းရိုး - သစ်သား ၃ ခု",
    "craft.recipe2": "2 ဝါးပန်းအိုး - ဝါး ၂ ခု + အပင် ၁ ခု",
    "craft.recipe3": "3 ရွာဆိုင်းဘုတ် - သစ်သား ၂ ခု + ဝါး ၁ ခု",
    "craft.choose": "1၊ 2 သို့မဟုတ် 3 ကို နှိပ်၍ ရွေးချယ်ပါ။",
    "craft.noWood": "သစ်သား ၃ ခု လိုအပ်ပါတယ်။",
    "craft.noPlanter": "ဝါး ၂ ခုနှင့် အပင် ၁ ခု လိုအပ်ပါတယ်။",
    "craft.noSign": "သစ်သား ၂ ခုနှင့် ဝါး ၁ ခု လိုအပ်ပါတယ်။",
    "craft.fenceDone": "သစ်သားခြံစည်းရိုး ပြုလုပ်ပြီးပါပြီ!",
    "craft.planterDone": "ဝါးပန်းအိုး ပြုလုပ်ပြီးပါပြီ!",
    "craft.signDone": "ရွာဆိုင်းဘုတ် ပြုလုပ်ပြီးပါပြီ!",
    "craft.fenceFull": "ခြံစည်းရိုး နေရာပြည့်နေပါပြီ!",
    "craft.planterFull": "ပန်းအိုး နေရာပြည့်နေပါပြီ!",
    "craft.signFull": "ရွာဆိုင်းဘုတ် ရှိပြီးသားပါ!",
    "craft.close": "C သို့မဟုတ် ESC နှိပ်၍ ပိတ်ပါ",

    "farm.day": "နေ့ {day} - လယ်ယာ",
    "farm.seeds": "စပါးမျိုးစေ့: {seeds}   စပါး: {rice}",
    "farm.tools": "1 ပေါက်တူး  2 မျိုးစေ့  3 ရေလောင်း  4 ရိတ်သိမ်း",
    "farm.findPlot": "စိုက်ခင်းနားသို့ သွားပြီး SPACE နှိပ်ပါ။",
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
    "farm.newDay": "နေ့သစ်ရောက်ပါပြီ! အပင် {grown} ပင် ကြီးထွားလာပါတယ်။",
    "farm.noTile": "စိုက်ခင်းနားသို့ ပိုမိုနီးကပ်စွာ သွားပါ!",
    "farm.selected": "ရွေးထားသော ကိရိယာ: {tool}",
    "farm.hoe": "ပေါက်တူး",
    "farm.seedTool": "မျိုးစေ့",
    "farm.water": "ရေလောင်း",
    "farm.harvest": "ရိတ်သိမ်း",

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

    "world.bambooGrove": "ဝါးတော",
    "world.monastery": "ဘုန်းကြီးကျောင်း",
    "world.lotusPond": "ကြာကန်",

    "dialogue.ma.0": "မင်္ဂလာပါ! ကျွန်မတို့ရွာမှ ကြိုဆိုပါတယ်။",
    "dialogue.ma.1": "ကျွန်မနာမည် မသီရိပါ။ မိသားစုနဲ့ ဒီရွာမှာ နေပါတယ်။",
    "dialogue.ma.2": "မနက်ခင်းမှာ ဈေးသွားလေ့ရှိပါတယ်။",
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
    return this.language === "my"
      ? '"Noto Sans Myanmar", "Myanmar Text", sans-serif'
      : "monospace";
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

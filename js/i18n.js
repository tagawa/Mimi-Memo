const strings = {
  en: {
    appName: 'Mimi Memo',
    'nav.home': 'Home', 'nav.history': 'History', 'nav.doctor': 'Doctor',
    'aria.nav': 'Main navigation',
    'home.logButton': 'Log it', 'home.recent': 'Recent',
    'home.empty': 'No entries yet', 'home.seeAll': 'See all',
    'log.title': 'Log tinnitus', 'log.editTitle': 'Edit entry', 'log.startTime': 'Time',
    'log.loudness': 'Loudness', 'log.mild': 'Mild', 'log.moderate': 'Moderate', 'log.severe': 'Severe',
    'log.character': 'Sound', 'log.ringing': 'Ringing', 'log.buzzing': 'Buzzing',
    'log.hissing': 'Hissing', 'log.roaring': 'Roaring', 'log.other': 'Other',
    'log.pitch': 'Pitch', 'log.high': 'High', 'log.low': 'Low', 'log.mixed': 'Mixed',
    'log.location': 'Location', 'log.left': 'Left ear', 'log.right': 'Right ear',
    'log.both': 'Both ears', 'log.inHead': 'In head',
    'log.pulsatile': 'Pulses with heartbeat?', 'log.yes': 'Yes', 'log.no': 'No',
    'log.differentFromUsual': 'Different from usual?', 'log.addDetails': 'Add details',
    'log.notes': 'Notes', 'log.notesPlaceholder': 'Anything else…',
    'log.save': 'Save', 'log.done': 'Done', 'log.delete': 'Delete', 'log.undo': 'Undo',
    'log.confirmDelete': 'Delete this entry?',
    'log.saved': 'Logged', 'log.updated': 'Updated', 'log.deleted': 'Deleted',
    'log.noLoudness': 'Loudness not set',
    'history.title': 'History', 'history.frequency': 'Frequency',
    'history.timeOfDay': 'Time of day', 'history.dayOfWeek': 'Day of week',
    'history.morning': 'Morning', 'history.afternoon': 'Afternoon',
    'history.evening': 'Evening', 'history.night': 'Night', 'history.empty': 'No entries yet',
    'doctor.title': 'Doctor summary', 'doctor.period': 'Period',
    'doctor.last30': 'Last 30 days', 'doctor.last90': 'Last 90 days', 'doctor.all': 'All time',
    'doctor.print': 'Print', 'doctor.totalEntries': 'Total entries', 'doctor.loudnessBreakdown': 'Loudness',
    'doctor.topCharacter': 'Most common sound', 'doctor.topPitch': 'Most common pitch', 'doctor.topLocation': 'Most common location',
    'doctor.peakTime': 'Most frequent time', 'doctor.peakDay': 'Most frequent day',
    'pressure.today': 'Today',
    'store.writeError': 'Could not save — storage may be full.',
  },
  ja: {
    appName: 'ミミメモ',
    'nav.home': 'ホーム', 'nav.history': '履歴', 'nav.doctor': '医師用',
    'aria.nav': 'メインナビゲーション',
    'home.logButton': '記録する', 'home.recent': '最近の記録',
    'home.empty': 'まだ記録がありません', 'home.seeAll': 'すべて見る',
    'log.title': '耳鳴りを記録', 'log.editTitle': '記録を編集', 'log.startTime': '時刻',
    'log.loudness': '大きさ', 'log.mild': '軽い', 'log.moderate': '中程度', 'log.severe': '重い',
    'log.character': '音の種類', 'log.ringing': 'キーン（高音）', 'log.buzzing': 'ブーン',
    'log.hissing': 'シャー', 'log.roaring': 'ゴー', 'log.other': 'その他',
    'log.pitch': '高さ', 'log.high': '高い', 'log.low': '低い', 'log.mixed': '混在',
    'log.location': '場所', 'log.left': '左耳', 'log.right': '右耳',
    'log.both': '両耳', 'log.inHead': '頭の中',
    'log.pulsatile': '脈打つ感じ？', 'log.yes': 'はい', 'log.no': 'いいえ',
    'log.differentFromUsual': 'いつもと違う？', 'log.addDetails': '詳細を追加',
    'log.notes': 'メモ', 'log.notesPlaceholder': 'その他…',
    'log.save': '保存', 'log.done': '完了', 'log.delete': '削除', 'log.undo': '取り消す',
    'log.confirmDelete': 'この記録を削除しますか？',
    'log.saved': '記録しました', 'log.updated': '更新しました', 'log.deleted': '削除しました',
    'log.noLoudness': '大きさ未設定',
    'history.title': '履歴', 'history.frequency': '頻度',
    'history.timeOfDay': '時間帯', 'history.dayOfWeek': '曜日',
    'history.morning': '朝', 'history.afternoon': '昼',
    'history.evening': '夕方', 'history.night': '夜', 'history.empty': 'まだ記録がありません',
    'doctor.title': '医師用サマリー', 'doctor.period': '期間',
    'doctor.last30': '過去30日', 'doctor.last90': '過去90日', 'doctor.all': 'すべて',
    'doctor.print': '印刷', 'doctor.totalEntries': '記録数', 'doctor.loudnessBreakdown': '大きさの内訳',
    'doctor.topCharacter': '最も多い音', 'doctor.topPitch': '最も多い高さ', 'doctor.topLocation': '最も多い場所',
    'doctor.peakTime': '最も多い時間帯', 'doctor.peakDay': '最も多い曜日',
    'pressure.today': '今日',
    'store.writeError': '保存できませんでした。ストレージがいっぱいかもしれません。',
  },
};

const storedLang = localStorage.getItem('mimi_lang');
let currentLang = storedLang ?? (navigator.language?.startsWith('ja') ? 'ja' : 'en');
document.documentElement.lang = currentLang;

export function t(key) {
  return strings[currentLang]?.[key] ?? strings.en?.[key] ?? key;
}
export function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('mimi_lang', lang);
  document.documentElement.lang = lang;
}
export function getLang() { return currentLang; }

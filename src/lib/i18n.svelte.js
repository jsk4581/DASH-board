// ============================================================
// Lightweight i18n for the UI chrome (Korean / English).
// `t(key)` reads ui.lang reactively, so flipping the language
// re-renders every label that calls it. Seed board content
// (project/task text) is user data and is NOT translated.
// ============================================================

import { ui } from './ui.svelte.js'

const dict = {
  ko: {
    // toolbar
    undo: '되돌리기',
    undoTitle: '되돌리기 (Ctrl+Z)',
    redo: '다시 실행',
    redoTitle: '다시 실행 (Ctrl+Y)',
    modeSwitch: '모드 전환',
    edit: '수정',
    view: '보기',
    save: '저장',
    saveTitle: '현재 보드를 JSON 파일로 저장 (Ctrl+S)',
    load: '불러오기',
    loadTitle: 'JSON 파일에서 불러오기',
    themeToggle: '테마 전환',
    langSwitch: '언어 전환',
    langName: '한국어',
    savedToast: 'JSON으로 저장했습니다',
    loadedToast: '불러왔습니다',
    loadFailed: '불러오기 실패: {msg}',

    // timeline
    schedule: '일정',
    next4w: '오늘부터 4주',
    next2w: '오늘부터 2주',
    timelineSwitch: '타임라인 보기 전환',
    calendar: '캘린더',
    gantt: '간트',
    calendarAria: '마감 캘린더',
    ganttEmpty: '기간이 지정된 항목이 없습니다. 항목에 마감일/기간을 지정해 보세요.',

    // board
    boardEmpty: '표시할 프로젝트가 없습니다. 수정 모드에서 추가하세요.',
    newProject: '새 프로젝트',

    // project card
    dragMove: '드래그하여 이동',
    projectGrip: '프로젝트 이동 핸들',
    changeColor: '색상 변경',
    projectColor: '프로젝트 색상',
    projectNamePlaceholder: '프로젝트 이름',
    doneTotal: '완료 / 전체',
    addItem: '항목 추가',
    deleteProject: '프로젝트 삭제',
    addFirstItem: '+ 첫 항목 추가',
    colorNamed: '색상 {c}',

    // todo item
    itemGrip: '항목 이동 핸들',
    markDone: '완료',
    markUndone: '완료 해제',
    toggleDone: '완료 토글',
    taskPlaceholder: '할 일 입력…',
    highlight: '강조',
    toggleHighlight: '강조 토글',
    due: '마감일',
    setDue: '마감일 지정',
    delete: '삭제',
    deleteItem: '항목 삭제',

    // date popover
    noDue: '마감일 없음',
    clearDue: '마감일 지우기',
    clear: '지우기',
    dateHint: '클릭=하루 · 드래그=기간',

    // sync (GitHub Gist)
    syncTooltip: '기기 간 동기화',
    syncTitle: '기기 간 동기화',
    syncDesc: '비공개 GitHub Gist에 보드를 저장해 어느 기기에서나 같은 데이터를 봅니다.',
    tokenLabel: 'GitHub 토큰',
    gistIdLabel: 'Gist ID',
    gistIdPlaceholder: '새로 만들려면 비워두세요',
    connect: '연결',
    connecting: '연결 중…',
    createToken: '토큰 만들기 ↗',
    tokenScopeHint: "'gist' 권한만 있으면 됩니다.",
    tokenWarning: '토큰은 이 브라우저에만 저장됩니다. 공용 PC에서는 사용하지 마세요.',
    statusSynced: '동기화됨',
    statusSyncing: '동기화 중…',
    statusOffline: '오프라인 — 연결되면 자동 반영',
    statusError: '동기화 오류',
    statusConflict: '데이터 충돌',
    lastSyncedAt: '마지막 동기화 {time}',
    copyId: 'ID 복사',
    copied: '복사됨',
    syncNow: '지금 동기화',
    pullFromCloud: '클라우드에서 가져오기',
    disconnect: '연결 해제',
    conflictMsg: '이 기기와 클라우드의 데이터가 다릅니다. 어느 쪽을 쓸까요?',
    useThisDevice: '이 기기 사용',
    useCloud: '클라우드 사용',
    errBadToken: '토큰이 올바르지 않습니다.',
    errNoGist: 'Gist를 찾을 수 없습니다. ID를 확인하세요.',
    errForbidden: '권한이 없거나 요청 한도를 초과했습니다.',
    errGeneric: '동기화에 실패했습니다.',

    // store
    untitled: '제목 없음',
    invalidFile: '유효한 DASH 파일이 아닙니다 (projects 배열 없음).',
  },

  en: {
    undo: 'Undo',
    undoTitle: 'Undo (Ctrl+Z)',
    redo: 'Redo',
    redoTitle: 'Redo (Ctrl+Y)',
    modeSwitch: 'Switch mode',
    edit: 'Edit',
    view: 'View',
    save: 'Save',
    saveTitle: 'Save the board as a JSON file (Ctrl+S)',
    load: 'Load',
    loadTitle: 'Load from a JSON file',
    themeToggle: 'Toggle theme',
    langSwitch: 'Switch language',
    langName: 'English',
    savedToast: 'Saved as JSON',
    loadedToast: 'Loaded',
    loadFailed: 'Load failed: {msg}',

    schedule: 'Schedule',
    next4w: 'Next 4 weeks',
    next2w: 'Next 2 weeks',
    timelineSwitch: 'Switch timeline view',
    calendar: 'Calendar',
    gantt: 'Gantt',
    calendarAria: 'Deadline calendar',
    ganttEmpty: 'No scheduled items yet. Set a due date or period on an item.',

    boardEmpty: 'No projects to show. Add one in Edit mode.',
    newProject: 'New project',

    dragMove: 'Drag to move',
    projectGrip: 'Project move handle',
    changeColor: 'Change color',
    projectColor: 'Project color',
    projectNamePlaceholder: 'Project name',
    doneTotal: 'Done / Total',
    addItem: 'Add item',
    deleteProject: 'Delete project',
    addFirstItem: '+ Add first item',
    colorNamed: 'Color {c}',

    itemGrip: 'Item move handle',
    markDone: 'Mark complete',
    markUndone: 'Mark incomplete',
    toggleDone: 'Toggle complete',
    taskPlaceholder: 'Add a task…',
    highlight: 'Highlight',
    toggleHighlight: 'Toggle highlight',
    due: 'Due date',
    setDue: 'Set due date',
    delete: 'Delete',
    deleteItem: 'Delete item',

    noDue: 'No due date',
    clearDue: 'Clear due date',
    clear: 'Clear',
    dateHint: 'Click = day · Drag = range',

    // sync (GitHub Gist)
    syncTooltip: 'Sync across devices',
    syncTitle: 'Sync across devices',
    syncDesc: 'Store your board in a private GitHub Gist to see the same data on any device.',
    tokenLabel: 'GitHub token',
    gistIdLabel: 'Gist ID',
    gistIdPlaceholder: 'Leave empty to create a new one',
    connect: 'Connect',
    connecting: 'Connecting…',
    createToken: 'Create a token ↗',
    tokenScopeHint: "It only needs the 'gist' scope.",
    tokenWarning: "The token is stored only in this browser. Don't use this on shared computers.",
    statusSynced: 'Synced',
    statusSyncing: 'Syncing…',
    statusOffline: 'Offline — will sync when reconnected',
    statusError: 'Sync error',
    statusConflict: 'Data conflict',
    lastSyncedAt: 'Last synced {time}',
    copyId: 'Copy ID',
    copied: 'Copied',
    syncNow: 'Sync now',
    pullFromCloud: 'Pull from cloud',
    disconnect: 'Disconnect',
    conflictMsg: 'This device and the cloud differ. Which copy should win?',
    useThisDevice: 'Use this device',
    useCloud: 'Use the cloud',
    errBadToken: 'That token is not valid.',
    errNoGist: 'Gist not found — check the ID.',
    errForbidden: 'Forbidden or rate‑limited.',
    errGeneric: 'Sync failed.',

    untitled: 'Untitled',
    invalidFile: 'Not a valid DASH file (no projects array).',
  },
}

/** Translate `key` for the current language, interpolating {name} vars. */
export function t(key, vars) {
  const table = dict[ui.lang] ?? dict.ko
  let s = table[key] ?? dict.ko[key] ?? key
  if (vars) for (const k in vars) s = s.replace(`{${k}}`, vars[k])
  return s
}

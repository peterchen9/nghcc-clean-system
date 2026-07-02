const STORAGE_KEY = "cleaning-work-system-v1";
const ADMIN_PASSWORD = "admin123";
const weekdays = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
const presetSchedule = [
  {
    staffName: "楊惠如",
    days: {
      星期一: [
        "1F 室外(前後)走廊",
        "1F 室內公共區(大靜電拖)",
        "1F 男+女+多功能廁所(清洗廁所需補備品)",
        "B1 收餐具",
        "1F 101",
        "全戶垃圾(收拾+分類)(分類需整理B1回收室)",
        "1F 室內公共區(大靜電拖)"
      ],
      星期四: [
        "2F 兒主廁所/內走廊/洗手台(清洗廁所需補備品)",
        "全戶垃圾(收拾+分類)(分類需整理B1回收室)",
        "1F 室內公共區(大靜電拖)"
      ],
      星期五: [
        "2F 男+女廁所(清洗廁所需補備品)",
        "2F 廚房(洗地板)",
        "1F 室內公共區(大靜電拖)"
      ],
      星期日: [
        "B1 餐具清洗/水槽/瀝水網",
        "B1 餐廳/B00/B01(桌面/地板)",
        "收垃圾(B1+1F)",
        "巡查1F廁所(不洗)",
        "1F 室內公共區(大靜電拖)"
      ]
    }
  },
  {
    staffName: "郭志華",
    days: {
      星期一: [
        "4F 大堂/外走廊",
        "4F 400/401/402/403",
        "1F 室內公共區(大靜電拖)"
      ],
      星期二: [
        "4F 男+女廁(清洗廁所需補備品)",
        "甲/乙梯(小靜電拖)",
        "巡視蜘蛛網(每週不同區域)",
        "1F 室內公共區(大靜電拖)"
      ]
    }
  },
  {
    staffName: "翁倩華",
    days: {
      星期二: [
        "3F 大堂/長青室/304/外走廊",
        "另清洗長青室廁所(清洗廁所需補備品)",
        "3F 301/302/303/外走廊"
      ],
      星期三: [
        "3F 乙梯 男+女+多功能廁所(清洗廁所需補備品)",
        "2F 辦公室/影印室/外走廊",
        "2F 廚房(台面/餐具/電器)"
      ],
      星期五: [
        "5F 501/兩側走廊",
        "5F 502/503/504/505",
        "6F 禱告室"
      ],
      星期六: [
        "1F 室外(前後)走廊",
        "1F 室內公共區(大靜電拖)",
        "前後花圃整理",
        "大停車場垃圾",
        "籃球場垃圾",
        "4F->3F->2F 走廊",
        "甲/乙梯(小靜電拖)",
        "全戶垃圾(收拾+分類)(分類需整理B1回收室)",
        "1F 室內公共區(大靜電拖)"
      ],
      星期日: [
        "1F 室外(前後)走廊",
        "1F 室內公共區(大靜電拖)",
        "4F->3F->2F 走廊",
        "巡查全戶廁所(不洗)",
        "B1 收拾愛宴餐具"
      ]
    }
  }
];

const seedData = {
  staff: [
    { id: "s1", name: "王小明", phone: "0912-000-001", hourlyRate: 200, active: true },
    { id: "s2", name: "林美玲", phone: "0912-000-002", hourlyRate: 220, active: true }
  ],
  areas: [
    { id: "a1", name: "一樓大廳", location: "入口、櫃台、等候區" },
    { id: "a2", name: "二樓教室", location: "教室 A、B 與走廊" }
  ],
  assignments: [
    { id: "as1", staffId: "s1", areaId: "a1", weekday: "星期一", tasks: "掃地、拖地、垃圾、玻璃門" },
    { id: "as2", staffId: "s2", areaId: "a2", weekday: "星期三", tasks: "桌椅、地板、白板、垃圾" }
  ],
  timeRecords: [],
  inspections: [],
  settlements: [],
  activeClocks: {},
  lastClockActions: {},
  taskCompletions: {},
  presetScheduleSynced: false
};

let state = structuredClone(seedData);
let localStateAtStartup = loadLocalState();
let session = { role: null, staffId: null };
let editingStaffId = null;
let editingAreaId = null;
let editingAssignmentId = null;
let editingTimeRecordId = null;

const $ = (id) => document.getElementById(id);

function normalizeState(data) {
  const parsed = { ...structuredClone(seedData), ...(data || {}) };
  if (!parsed.activeClocks) parsed.activeClocks = {};
  if (!parsed.lastClockActions) parsed.lastClockActions = {};
  if (!parsed.taskCompletions) parsed.taskCompletions = {};
  if (typeof parsed.presetScheduleSynced !== "boolean") parsed.presetScheduleSynced = false;
  if (parsed.activeClock?.staffId) {
    parsed.activeClocks[parsed.activeClock.staffId] = parsed.activeClock;
    delete parsed.activeClock;
  }
  return parsed;
}

function loadLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function loadState() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      if (data.state) return normalizeState(data.state);
    }
  } catch {
    // Offline or static fallback.
  }
  return localStateAtStartup || structuredClone(seedData);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  persistServerState(state);
}

async function persistServerState(data) {
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    $("syncStatus").textContent = "已同步到伺服器";
  } catch {
    $("syncStatus").textContent = "目前只儲存在本機，伺服器同步失敗";
  }
}

async function publishLocalDataToServer() {
  if (!localStateAtStartup) {
    alert("這支裝置沒有可上傳的本機資料。");
    return;
  }
  if (!confirm("確定要用這支裝置目前的本機資料覆蓋伺服器共用資料？其他人重新開啟後會看到這份資料。")) return;
  state = normalizeState(localStateAtStartup);
  syncPresetSchedule({ markSynced: true });
  await persistServerState(state);
  renderAll();
  $("syncStatus").textContent = "已將這支裝置的本機資料同步到伺服器";
}

function uid(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function localDateISO(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTimeHHMM(value) {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function hoursBetween(start, end) {
  return Math.max(0, (new Date(end) - new Date(start)) / 36e5);
}

function minutesBetween(start, end) {
  return Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000));
}

function billableHoursFromMinutes(minutes) {
  if (minutes <= 20) return minutes / 60;
  return Math.ceil(minutes / 30) * 0.5;
}

function money(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    maximumFractionDigits: 0
  }).format(value);
}

function byId(collection, id) {
  return collection.find((item) => item.id === id);
}

function isStaffActive(staff) {
  return staff.active !== false;
}

function emptyState() {
  return $("emptyStateTemplate").content.firstElementChild.cloneNode(true);
}

function clearAndAppend(container, nodes) {
  container.innerHTML = "";
  if (!nodes.length) {
    container.appendChild(emptyState());
    return;
  }
  nodes.forEach((node) => container.appendChild(node));
}

async function init() {
  state = await loadState();
  bindLogin();
  bindStaff();
  bindAdmin();
  if (!state.presetScheduleSynced) {
    syncPresetSchedule({ markSynced: true });
  }
  renderAll();
}

function bindLogin() {
  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const staffId = $("loginStaff").value;
    if (!staffId) {
      alert("請先建立工作人員");
      return;
    }
    session = { role: "staff", staffId };
    showView("staff");
    renderAll();
  });
  $("adminLoginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if ($("adminPassword").value !== ADMIN_PASSWORD) {
      alert("後台密碼錯誤");
      return;
    }
    session = { role: "admin", staffId: null };
    showView("admin");
    renderAll();
  });
  $("adminAccessBtn").addEventListener("click", () => {
    session = { role: null, staffId: null };
    showView("adminLogin");
    renderAll();
  });
  $("staffAccessBtn").addEventListener("click", () => {
    session = { role: null, staffId: null };
    $("adminPassword").value = "";
    showView("login");
    renderAll();
  });
  $("logoutBtn").addEventListener("click", () => {
    session = { role: null, staffId: null };
    $("adminPassword").value = "";
    showView("login");
    renderAll();
  });
}

function showView(view) {
  $("loginView").classList.toggle("hidden", view !== "login");
  $("adminLoginView").classList.toggle("hidden", view !== "adminLogin");
  $("staffView").classList.toggle("hidden", view !== "staff");
  $("adminView").classList.toggle("hidden", view !== "admin");
  $("adminAccessBtn").classList.toggle("hidden", view === "admin" || view === "adminLogin");
  $("staffAccessBtn").classList.toggle("hidden", view !== "admin" && view !== "adminLogin");
  $("logoutBtn").classList.toggle("hidden", view === "login" || view === "adminLogin");
}

function bindStaff() {
  $("clockBtn").addEventListener("click", toggleClock);
  $("weekdayFilter").addEventListener("change", renderStaffAssignments);
  $("staffAssignments").addEventListener("change", (event) => {
    if (!event.target.matches("[data-assignment-complete]")) return;
    state.taskCompletions[event.target.dataset.assignmentComplete] = event.target.checked;
    saveState();
    renderStaffAssignments();
  });
}

function toggleClock() {
  const staffId = session.staffId;
  if (!staffId) return;
  const now = new Date().toISOString();
  const lastAction = state.lastClockActions?.[staffId];
  if (lastAction && minutesBetween(lastAction, now) < 15) {
    alert("15分鐘內不能重覆打卡，請稍後再試。");
    return;
  }
  const activeClock = getActiveClock(staffId);
  if (activeClock) {
    const actualMinutes = minutesBetween(activeClock.clockIn, now);
    const billableHours = billableHoursFromMinutes(actualMinutes);
    state.timeRecords.push({
      id: uid("t"),
      staffId,
      clockIn: activeClock.clockIn,
      clockOut: now,
      actualMinutes,
      hours: billableHours,
      settled: false
    });
    delete state.activeClocks[staffId];
  } else {
    state.activeClocks[staffId] = { staffId, clockIn: now };
  }
  state.lastClockActions[staffId] = now;
  saveState();
  renderAll();
}

function getActiveClock(staffId) {
  return state.activeClocks?.[staffId] || null;
}

function bindAdmin() {
  document.querySelectorAll(".tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tabs button").forEach((tab) => tab.classList.remove("active"));
      document.querySelectorAll(".admin-tab").forEach((tab) => tab.classList.add("hidden"));
      button.classList.add("active");
      $(button.dataset.tab).classList.remove("hidden");
    });
  });

  $("staffForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (editingStaffId) {
      const staff = byId(state.staff, editingStaffId);
      if (staff) {
        staff.name = $("staffName").value.trim();
        staff.phone = $("staffPhone").value.trim();
        staff.hourlyRate = Number($("staffRate").value);
      }
      resetStaffForm();
    } else {
      state.staff.push({
        id: uid("s"),
        name: $("staffName").value.trim(),
        phone: $("staffPhone").value.trim(),
        hourlyRate: Number($("staffRate").value),
        active: true
      });
      event.target.reset();
    }
    saveState();
    renderAll();
  });
  $("staffCancelEditBtn").addEventListener("click", resetStaffForm);

  $("areaForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (editingAreaId) {
      const area = byId(state.areas, editingAreaId);
      if (area) {
        area.name = $("areaName").value.trim();
        area.location = $("areaLocation").value.trim();
      }
      resetAreaForm();
    } else {
      state.areas.push({
        id: uid("a"),
        name: $("areaName").value.trim(),
        location: $("areaLocation").value.trim()
      });
      event.target.reset();
    }
    saveState();
    renderAll();
  });
  $("areaCancelEditBtn").addEventListener("click", resetAreaForm);

  $("assignmentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (editingAssignmentId) {
      const assignment = byId(state.assignments, editingAssignmentId);
      if (assignment) {
        assignment.staffId = $("assignmentStaff").value;
        assignment.areaId = $("assignmentArea").value;
        assignment.weekday = $("assignmentWeekday").value;
        assignment.tasks = $("assignmentTasks").value.trim();
        assignment.updatedAt = new Date().toISOString();
      }
      resetAssignmentForm();
    } else {
      state.assignments.push({
        id: uid("as"),
        staffId: $("assignmentStaff").value,
        areaId: $("assignmentArea").value,
        weekday: $("assignmentWeekday").value,
        tasks: $("assignmentTasks").value.trim()
      });
      event.target.reset();
    }
    saveState();
    renderAll();
  });
  $("assignmentCancelEditBtn").addEventListener("click", resetAssignmentForm);

  $("importPresetScheduleBtn").addEventListener("click", () => syncPresetSchedule({ showResult: true, force: true, markSynced: true }));

  $("inspectionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.inspections.unshift({
      id: uid("i"),
      staffId: $("inspectionStaff").value,
      areaId: $("inspectionArea").value,
      score: Number($("inspectionScore").value),
      note: $("inspectionNote").value.trim(),
      createdAt: new Date().toISOString()
    });
    event.target.reset();
    saveState();
    renderAll();
  });

  $("settlementForm").addEventListener("submit", (event) => {
    event.preventDefault();
    settlePayroll($("settleStart").value, $("settleEnd").value, $("settlementStaff").value);
  });
  $("timeFilterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    renderPayrollAdmin();
  });
  $("timeRecordForm").addEventListener("submit", (event) => {
    event.preventDefault();
    saveTimeRecordFromForm();
  });
  $("timeRecordCancelEditBtn").addEventListener("click", resetTimeRecordForm);
  $("publishLocalDataBtn").addEventListener("click", publishLocalDataToServer);
}

function syncPresetSchedule(options = {}) {
  const { showResult = false, force = false, markSynced = false } = options;
  if (state.presetScheduleSynced && !force) {
    return { createdAreas: 0, createdAssignments: 0, skippedAssignments: 0, missingStaff: [], message: "圖片班表已同步過。" };
  }
  let createdAreas = 0;
  let createdAssignments = 0;
  let skippedAssignments = 0;
  const missingStaff = [];

  presetSchedule.forEach((personSchedule) => {
    const staff = state.staff.find((item) => item.name.trim() === personSchedule.staffName);
    if (!staff) {
      missingStaff.push(personSchedule.staffName);
      return;
    }

    Object.entries(personSchedule.days).forEach(([weekday, areaNames]) => {
      areaNames.forEach((areaName) => {
        const area = findOrCreateArea(areaName);
        if (area.created) createdAreas += 1;

        const exists = state.assignments.some((assignment) => {
          return assignment.staffId === staff.id && assignment.areaId === area.id && assignment.weekday === weekday;
        });
        if (exists) {
          skippedAssignments += 1;
          return;
        }

        state.assignments.push({
          id: uid("as"),
          staffId: staff.id,
          areaId: area.id,
          weekday,
          tasks: areaName,
          source: "preset-1782896963195"
        });
        createdAssignments += 1;
      });
    });
  });

  if (markSynced) {
    state.presetScheduleSynced = true;
  }
  if (createdAreas > 0 || createdAssignments > 0 || markSynced) {
    saveState();
  }
  if (showResult) {
    renderAll();
  }
  const missingText = missingStaff.length ? `未找到人員：${missingStaff.join("、")}。` : "所有圖片人員都已找到。";
  const message = `已新增 ${createdAreas} 個區域、${createdAssignments} 筆工作內容，略過 ${skippedAssignments} 筆既有內容。${missingText}`;
  if (showResult) {
    $("importScheduleResult").textContent = message;
  }
  return { createdAreas, createdAssignments, skippedAssignments, missingStaff, message };
}

function findOrCreateArea(name) {
  const existing = state.areas.find((area) => area.name === name);
  if (existing) return { ...existing, created: false };
  const area = { id: uid("a"), name, location: "圖片班表匯入" };
  state.areas.push(area);
  return { ...area, created: true };
}

function settlePayroll(startDate, endDate, staffId = "all") {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const records = state.timeRecords.filter((record) => {
    const clockIn = new Date(record.clockIn);
    return !record.settled && clockIn >= start && clockIn <= end && (staffId === "all" || record.staffId === staffId);
  });
  if (!records.length) {
    alert("此日期區間沒有未結算工時");
    return;
  }
  const totals = {};
  records.forEach((record) => {
    const staff = byId(state.staff, record.staffId);
    if (!staff) return;
    totals[record.staffId] ||= { staffId: record.staffId, hours: 0, amount: 0 };
    totals[record.staffId].hours += record.hours;
    totals[record.staffId].amount += record.hours * staff.hourlyRate;
    record.settled = true;
    record.settlementId = null;
  });
  const settlement = {
    id: uid("p"),
    startDate,
    endDate,
    staffId,
    createdAt: new Date().toISOString(),
    items: Object.values(totals)
  };
  state.timeRecords.forEach((record) => {
    if (records.includes(record)) record.settlementId = settlement.id;
  });
  state.settlements.unshift(settlement);
  saveState();
  renderAll();
}

function saveTimeRecordFromForm() {
  const staffId = $("timeRecordStaff").value;
  const date = $("timeRecordDate").value;
  const startTime = $("timeRecordStart").value;
  const endTime = $("timeRecordEnd").value;
  const clockIn = new Date(`${date}T${startTime}:00`);
  const clockOut = new Date(`${date}T${endTime}:00`);
  if (clockOut <= clockIn) {
    alert("結束時間必須晚於開始時間");
    return;
  }
  const actualMinutes = minutesBetween(clockIn, clockOut);
  const manualHours = $("timeRecordHours").value;
  const hours = manualHours === "" ? billableHoursFromMinutes(actualMinutes) : Number(manualHours);
  if (Number.isNaN(hours) || hours < 0) {
    alert("計薪小時格式不正確");
    return;
  }

  if (editingTimeRecordId) {
    const record = byId(state.timeRecords, editingTimeRecordId);
    if (record) {
      const previousSettlementId = record.settlementId;
      record.staffId = staffId;
      record.clockIn = clockIn.toISOString();
      record.clockOut = clockOut.toISOString();
      record.actualMinutes = actualMinutes;
      record.hours = hours;
      record.updatedAt = new Date().toISOString();
      if (previousSettlementId) rebuildSettlementTotals(previousSettlementId);
    }
    resetTimeRecordForm();
  } else {
    state.timeRecords.push({
      id: uid("t"),
      staffId,
      clockIn: clockIn.toISOString(),
      clockOut: clockOut.toISOString(),
      actualMinutes,
      hours,
      settled: false,
      manual: true,
      createdAt: new Date().toISOString()
    });
    $("timeRecordForm").reset();
    $("timeRecordDate").value = todayISO();
  }
  saveState();
  renderAll();
}

function rebuildSettlementTotals(settlementId) {
  const settlement = state.settlements.find((item) => item.id === settlementId);
  if (!settlement) return;
  const totals = {};
  state.timeRecords
    .filter((record) => record.settlementId === settlementId && record.settled)
    .forEach((record) => {
      const staff = byId(state.staff, record.staffId);
      if (!staff) return;
      totals[record.staffId] ||= { staffId: record.staffId, hours: 0, amount: 0 };
      totals[record.staffId].hours += record.hours;
      totals[record.staffId].amount += record.hours * staff.hourlyRate;
    });
  settlement.items = Object.values(totals);
  settlement.updatedAt = new Date().toISOString();
}

function editTimeRecord(id) {
  const record = byId(state.timeRecords, id);
  if (!record) return;
  editingTimeRecordId = id;
  $("timeRecordStaff").value = record.staffId;
  $("timeRecordDate").value = localDateISO(record.clockIn);
  $("timeRecordStart").value = localTimeHHMM(record.clockIn);
  $("timeRecordEnd").value = localTimeHHMM(record.clockOut);
  $("timeRecordHours").value = Number(record.hours || 0).toFixed(2);
  $("timeRecordFormTitle").textContent = "修改工時";
  $("timeRecordSubmitBtn").textContent = "儲存修改";
  $("timeRecordCancelEditBtn").classList.remove("hidden");
  $("timeRecordHours").focus();
}

function resetTimeRecordForm() {
  editingTimeRecordId = null;
  $("timeRecordForm").reset();
  $("timeRecordDate").value = todayISO();
  $("timeRecordFormTitle").textContent = "新增工時";
  $("timeRecordSubmitBtn").textContent = "新增";
  $("timeRecordCancelEditBtn").classList.add("hidden");
}

function renderAll() {
  renderLogin();
  renderSharedOptions();
  if (session.role === "staff") renderStaffView();
  if (session.role === "admin") renderAdminView();
}

function renderLogin() {
  const activeStaff = state.staff.filter(isStaffActive);
  $("loginStaff").innerHTML = activeStaff
    .map((staff) => `<option value="${staff.id}">${escapeHtml(staff.name)}</option>`)
    .join("");
  $("loginSummary").innerHTML = `
    <div class="metric"><span>工作人員</span><strong>${state.staff.filter(isStaffActive).length}</strong></div>
    <div class="metric"><span>工作區域</span><strong>${state.areas.length}</strong></div>
    <div class="metric"><span>本週內容</span><strong>${state.assignments.length}</strong></div>
    <div class="metric"><span>未結算筆數</span><strong>${state.timeRecords.filter((record) => !record.settled).length}</strong></div>
  `;
}

function renderSharedOptions() {
  const staffOptions = state.staff
    .filter(isStaffActive)
    .map((staff) => `<option value="${staff.id}">${escapeHtml(staff.name)}</option>`)
    .join("");
  const areaOptions = state.areas
    .map((area) => `<option value="${area.id}">${escapeHtml(area.name)}</option>`)
    .join("");
  const weekdayOptions = weekdays.map((day) => `<option value="${day}">${day}</option>`).join("");

  ["assignmentStaff", "inspectionStaff"].forEach((id) => ($(id).innerHTML = staffOptions));
  ["assignmentArea", "inspectionArea"].forEach((id) => ($(id).innerHTML = areaOptions));
  $("assignmentWeekday").innerHTML = weekdayOptions;
  $("weekdayFilter").innerHTML = `<option value="全部">全部星期</option>${weekdayOptions}`;
  $("settlementStaff").innerHTML = `<option value="all">全部人員</option>${staffOptions}`;
  $("timeFilterStaff").innerHTML = `<option value="all">全部人員</option>${staffOptions}`;
  $("timeRecordStaff").innerHTML = staffOptions;

  const today = todayISO();
  if (!$("settleStart").value) $("settleStart").value = today;
  if (!$("settleEnd").value) $("settleEnd").value = today;
  if (!$("timeFilterDate").value) $("timeFilterDate").value = today;
  if (!$("timeRecordDate").value) $("timeRecordDate").value = today;
}

function renderStaffView() {
  const staff = byId(state.staff, session.staffId);
  if (!staff) return;
  const activeClock = getActiveClock(staff.id);
  const unsettled = state.timeRecords.filter((record) => record.staffId === staff.id && !record.settled);
  const unsettledHours = unsettled.reduce((sum, record) => sum + record.hours, 0);

  $("staffTitle").textContent = staff.name;
  $("staffStatus").textContent = activeClock ? "上班中" : "未打卡";
  $("unsettledHours").textContent = `${unsettledHours.toFixed(2)} 小時`;
  $("clockBtn").textContent = activeClock ? "下班打卡" : "上班打卡";
  $("clockHint").textContent = activeClock ? `上班時間 ${formatDateTime(activeClock.clockIn)}` : "請於開始工作時打卡";

  renderStaffAssignments();
  renderStaffRecords(unsettled);
}

function renderStaffAssignments() {
  const staffId = session.staffId;
  const filter = $("weekdayFilter").value || "全部";
  const assignments = state.assignments.filter((assignment) => {
    return assignment.staffId === staffId && (filter === "全部" || assignment.weekday === filter);
  });
  const nodes = assignments.map((assignment) => {
    const area = byId(state.areas, assignment.areaId);
    const warning = needsCleaningAttention(staffId, assignment.areaId);
    const completionKey = getCompletionKey(staffId, assignment.id);
    const completed = Boolean(state.taskCompletions[completionKey]);
    const item = document.createElement("div");
    item.className = `work-item ${completed ? "completed" : ""}`;
    item.innerHTML = `
      <label class="task-check">
        <input type="checkbox" data-assignment-complete="${escapeHtml(completionKey)}" ${completed ? "checked" : ""}>
        <span>
          <strong>${assignment.weekday} / ${escapeHtml(area?.name || "已刪除區域")}</strong>
          <span>${escapeHtml(area?.location || "")}</span>
          <span>${escapeHtml(assignment.tasks)}</span>
          ${warning ? '<span class="warning-text">請加強清潔</span>' : ""}
        </span>
      </label>
    `;
    return item;
  });
  clearAndAppend($("staffAssignments"), nodes);
}

function getCompletionKey(staffId, assignmentId) {
  return `${todayISO()}::${staffId}::${assignmentId}`;
}

function needsCleaningAttention(staffId, areaId) {
  const latest = state.inspections.find((inspection) => inspection.staffId === staffId && inspection.areaId === areaId);
  return latest && latest.score < 3;
}

function renderStaffRecords(records) {
  const nodes = records.map((record) => {
    const item = document.createElement("div");
    item.className = "record-item";
    item.innerHTML = `
      <strong>${record.hours.toFixed(2)} 計薪小時</strong>
      <span class="record-meta">${formatDateTime(record.clockIn)} - ${formatDateTime(record.clockOut)} / 實際 ${record.actualMinutes ?? Math.round(record.hours * 60)} 分鐘</span>
    `;
    return item;
  });
  clearAndAppend($("staffTimeRecords"), nodes);
}

function renderAdminView() {
  renderStaffAdmin();
  renderAreaAdmin();
  renderAssignmentAdmin();
  renderInspectionAdmin();
  renderPayrollAdmin();
}

function renderStaffAdmin() {
  const nodes = state.staff.map((staff) => row(
    `${staff.name} ${isStaffActive(staff) ? "" : "（停用）"}`,
    `${staff.phone || "無手機"} / 時薪 ${money(staff.hourlyRate)}`,
    [
      button("修改", () => editStaff(staff.id)),
      button(isStaffActive(staff) ? "停用" : "啟用", () => {
        staff.active = !isStaffActive(staff);
        saveState();
        renderAll();
      }),
      button("刪除", () => removeItem("staff", staff.id), "danger")
    ]
  ));
  clearAndAppend($("staffAdminList"), nodes);
}

function renderAreaAdmin() {
  const nodes = state.areas.map((area) => row(
    area.name,
    area.location || "未填位置",
    [
      button("修改", () => editArea(area.id)),
      button("刪除", () => removeItem("areas", area.id), "danger")
    ]
  ));
  clearAndAppend($("areaAdminList"), nodes);
}

function renderAssignmentAdmin() {
  const nodes = state.assignments.map((assignment) => {
    const staff = byId(state.staff, assignment.staffId);
    const area = byId(state.areas, assignment.areaId);
    return row(
      `${assignment.weekday} / ${staff?.name || "已刪除人員"} / ${area?.name || "已刪除區域"}`,
      assignment.tasks,
      [
        button("修改", () => editAssignment(assignment.id)),
        button("刪除", () => removeItem("assignments", assignment.id), "danger")
      ]
    );
  });
  clearAndAppend($("assignmentAdminList"), nodes);
}

function editStaff(id) {
  const staff = byId(state.staff, id);
  if (!staff) return;
  editingStaffId = id;
  $("staffName").value = staff.name;
  $("staffPhone").value = staff.phone || "";
  $("staffRate").value = staff.hourlyRate;
  $("staffFormTitle").textContent = "修改工作人員";
  $("staffSubmitBtn").textContent = "儲存修改";
  $("staffCancelEditBtn").classList.remove("hidden");
  $("staffName").focus();
}

function resetStaffForm() {
  editingStaffId = null;
  $("staffForm").reset();
  $("staffFormTitle").textContent = "新增工作人員";
  $("staffSubmitBtn").textContent = "新增";
  $("staffCancelEditBtn").classList.add("hidden");
}

function editArea(id) {
  const area = byId(state.areas, id);
  if (!area) return;
  editingAreaId = id;
  $("areaName").value = area.name;
  $("areaLocation").value = area.location || "";
  $("areaFormTitle").textContent = "修改工作區域";
  $("areaSubmitBtn").textContent = "儲存修改";
  $("areaCancelEditBtn").classList.remove("hidden");
  $("areaName").focus();
}

function resetAreaForm() {
  editingAreaId = null;
  $("areaForm").reset();
  $("areaFormTitle").textContent = "新增工作區域";
  $("areaSubmitBtn").textContent = "新增";
  $("areaCancelEditBtn").classList.add("hidden");
}

function editAssignment(id) {
  const assignment = byId(state.assignments, id);
  if (!assignment) return;
  editingAssignmentId = id;
  $("assignmentStaff").value = assignment.staffId;
  $("assignmentArea").value = assignment.areaId;
  $("assignmentWeekday").value = assignment.weekday;
  $("assignmentTasks").value = assignment.tasks;
  $("assignmentFormTitle").textContent = "修改個人工作內容";
  $("assignmentSubmitBtn").textContent = "儲存修改";
  $("assignmentCancelEditBtn").classList.remove("hidden");
  $("assignmentTasks").focus();
}

function resetAssignmentForm() {
  editingAssignmentId = null;
  $("assignmentForm").reset();
  $("assignmentFormTitle").textContent = "安排打掃內容";
  $("assignmentSubmitBtn").textContent = "新增";
  $("assignmentCancelEditBtn").classList.add("hidden");
}

function renderInspectionAdmin() {
  const nodes = state.inspections.map((inspection) => {
    const staff = byId(state.staff, inspection.staffId);
    const area = byId(state.areas, inspection.areaId);
    return row(
      `${inspection.score} 分 / ${staff?.name || "已刪除人員"} / ${area?.name || "已刪除區域"}`,
      `${formatDateTime(inspection.createdAt)} ${inspection.note || ""}`,
      []
    );
  });
  clearAndAppend($("inspectionList"), nodes);
}

function renderPayrollAdmin() {
  const unsettledByStaff = state.staff.map((staff) => {
    const hours = state.timeRecords
      .filter((record) => record.staffId === staff.id && !record.settled)
      .reduce((sum, record) => sum + record.hours, 0);
    return row(staff.name, `未結算 ${hours.toFixed(2)} 小時 / ${money(hours * staff.hourlyRate)}`, []);
  });
  clearAndAppend($("payrollSummary"), unsettledByStaff);
  renderTimeRecordAdmin();

  const settlements = state.settlements.map((settlement) => {
    const detail = settlement.items
      .map((item) => {
        const staff = byId(state.staff, item.staffId);
        return `${staff?.name || "已刪除人員"}：${item.hours.toFixed(2)} 小時，${money(item.amount)}`;
      })
      .join("；");
    const target = settlement.staffId && settlement.staffId !== "all" ? byId(state.staff, settlement.staffId)?.name || "指定人員" : "全部人員";
    return row(`${settlement.startDate} 至 ${settlement.endDate} / ${target}`, detail, []);
  });
  clearAndAppend($("settlementList"), settlements);
}

function renderTimeRecordAdmin() {
  const filterStaff = $("timeFilterStaff").value || "all";
  const filterDate = $("timeFilterDate").value;
  const records = state.timeRecords
    .filter((record) => filterStaff === "all" || record.staffId === filterStaff)
    .filter((record) => !filterDate || localDateISO(record.clockIn) === filterDate)
    .sort((a, b) => new Date(b.clockIn) - new Date(a.clockIn));

  const nodes = records.map((record) => {
    const staff = byId(state.staff, record.staffId);
    const status = record.settled ? "已結算" : "未結算";
    const date = localDateISO(record.clockIn);
    const timeRange = `${localTimeHHMM(record.clockIn)}-${localTimeHHMM(record.clockOut)}`;
    const actualMinutes = record.actualMinutes ?? Math.round((record.hours || 0) * 60);
    return row(
      `${date} / ${staff?.name || "已刪除人員"} / ${status}`,
      `${timeRange} / 實際 ${actualMinutes} 分鐘 / 計薪 ${Number(record.hours || 0).toFixed(2)} 小時`,
      [button("修改", () => editTimeRecord(record.id))]
    );
  });
  clearAndAppend($("timeRecordList"), nodes);
}

function row(title, subtitle, actions) {
  const node = document.createElement("div");
  node.className = "row";
  const actionHtml = actions.length ? '<div class="row-actions"></div>' : "";
  node.innerHTML = `
    <div>
      <strong>${escapeHtml(title)}</strong>
      <div class="record-meta">${escapeHtml(subtitle)}</div>
    </div>
    ${actionHtml}
  `;
  const actionWrap = node.querySelector(".row-actions");
  actions.forEach((action) => actionWrap.appendChild(action));
  return node;
}

function button(label, onClick, className = "") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `small-btn ${className}`.trim();
  btn.textContent = label;
  btn.addEventListener("click", onClick);
  return btn;
}

function removeItem(collection, id) {
  if (!confirm("確定刪除？")) return;
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState();
  renderAll();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init();

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
  taskCompletions: {}
};

let state = loadState();
let session = { role: null, staffId: null };

const $ = (id) => document.getElementById(id);

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(seedData);
  try {
    const parsed = { ...structuredClone(seedData), ...JSON.parse(raw) };
    if (!parsed.activeClocks) parsed.activeClocks = {};
    if (!parsed.taskCompletions) parsed.taskCompletions = {};
    if (parsed.activeClock?.staffId) {
      parsed.activeClocks[parsed.activeClock.staffId] = parsed.activeClock;
      delete parsed.activeClock;
    }
    return parsed;
  } catch {
    return structuredClone(seedData);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

function hoursBetween(start, end) {
  return Math.max(0, (new Date(end) - new Date(start)) / 36e5);
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

function init() {
  bindLogin();
  bindStaff();
  bindAdmin();
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
  const activeClock = getActiveClock(staffId);
  if (activeClock) {
    state.timeRecords.push({
      id: uid("t"),
      staffId,
      clockIn: activeClock.clockIn,
      clockOut: now,
      hours: hoursBetween(activeClock.clockIn, now),
      settled: false
    });
    delete state.activeClocks[staffId];
  } else {
    state.activeClocks[staffId] = { staffId, clockIn: now };
  }
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
    state.staff.push({
      id: uid("s"),
      name: $("staffName").value.trim(),
      phone: $("staffPhone").value.trim(),
      hourlyRate: Number($("staffRate").value),
      active: true
    });
    event.target.reset();
    saveState();
    renderAll();
  });

  $("areaForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.areas.push({
      id: uid("a"),
      name: $("areaName").value.trim(),
      location: $("areaLocation").value.trim()
    });
    event.target.reset();
    saveState();
    renderAll();
  });

  $("assignmentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.assignments.push({
      id: uid("as"),
      staffId: $("assignmentStaff").value,
      areaId: $("assignmentArea").value,
      weekday: $("assignmentWeekday").value,
      tasks: $("assignmentTasks").value.trim()
    });
    event.target.reset();
    saveState();
    renderAll();
  });

  $("importPresetScheduleBtn").addEventListener("click", importPresetSchedule);

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
    settlePayroll($("settleStart").value, $("settleEnd").value);
  });
}

function importPresetSchedule() {
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

  saveState();
  renderAll();
  const missingText = missingStaff.length ? `未找到人員：${missingStaff.join("、")}。` : "所有圖片人員都已找到。";
  $("importScheduleResult").textContent =
    `已新增 ${createdAreas} 個區域、${createdAssignments} 筆工作內容，略過 ${skippedAssignments} 筆既有內容。${missingText}`;
}

function findOrCreateArea(name) {
  const existing = state.areas.find((area) => area.name === name);
  if (existing) return { ...existing, created: false };
  const area = { id: uid("a"), name, location: "圖片班表匯入" };
  state.areas.push(area);
  return { ...area, created: true };
}

function settlePayroll(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T23:59:59`);
  const records = state.timeRecords.filter((record) => {
    const clockIn = new Date(record.clockIn);
    return !record.settled && clockIn >= start && clockIn <= end;
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

function renderAll() {
  renderLogin();
  renderSharedOptions();
  if (session.role === "staff") renderStaffView();
  if (session.role === "admin") renderAdminView();
}

function renderLogin() {
  const activeStaff = state.staff.filter((staff) => staff.active);
  $("loginStaff").innerHTML = activeStaff
    .map((staff) => `<option value="${staff.id}">${escapeHtml(staff.name)}</option>`)
    .join("");
  $("loginSummary").innerHTML = `
    <div class="metric"><span>工作人員</span><strong>${state.staff.filter((staff) => staff.active).length}</strong></div>
    <div class="metric"><span>工作區域</span><strong>${state.areas.length}</strong></div>
    <div class="metric"><span>本週內容</span><strong>${state.assignments.length}</strong></div>
    <div class="metric"><span>未結算筆數</span><strong>${state.timeRecords.filter((record) => !record.settled).length}</strong></div>
  `;
}

function renderSharedOptions() {
  const staffOptions = state.staff
    .filter((staff) => staff.active)
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

  const today = todayISO();
  if (!$("settleStart").value) $("settleStart").value = today;
  if (!$("settleEnd").value) $("settleEnd").value = today;
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
      <strong>${record.hours.toFixed(2)} 小時</strong>
      <span class="record-meta">${formatDateTime(record.clockIn)} - ${formatDateTime(record.clockOut)}</span>
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
    `${staff.name} ${staff.active ? "" : "（停用）"}`,
    `${staff.phone || "無手機"} / 時薪 ${money(staff.hourlyRate)}`,
    [
      button(staff.active ? "停用" : "啟用", () => {
        staff.active = !staff.active;
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
    [button("刪除", () => removeItem("areas", area.id), "danger")]
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
      [button("刪除", () => removeItem("assignments", assignment.id), "danger")]
    );
  });
  clearAndAppend($("assignmentAdminList"), nodes);
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

  const settlements = state.settlements.map((settlement) => {
    const detail = settlement.items
      .map((item) => {
        const staff = byId(state.staff, item.staffId);
        return `${staff?.name || "已刪除人員"}：${item.hours.toFixed(2)} 小時，${money(item.amount)}`;
      })
      .join("；");
    return row(`${settlement.startDate} 至 ${settlement.endDate}`, detail, []);
  });
  clearAndAppend($("settlementList"), settlements);
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

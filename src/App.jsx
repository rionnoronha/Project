import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URLS = [
  import.meta.env.VITE_API_BASE_URL,
  'http://127.0.0.1:8000',
  'http://localhost:8000',
].filter(Boolean)

const sidebarItems = ['Dashboard', 'Students', 'Reports', 'Settings']
const initialFormState = {
  student_id: '',
  name: '',
  department_id: '',
  admission_year: '',
  status: 'ACTIVE',
}

const normalizeStatus = (status) => {
  const value = status?.toString().trim().toUpperCase()

  if (value === 'GRADUATED') {
    return 'Graduated'
  }

  if (value === 'ACTIVE' || value === 'ENROLLED') {
    return 'Active'
  }

  return 'Inactive'
}

const normalizeStudent = (student) => ({
  id: student.student_id ?? student.id ?? '',
  name: student.name ?? 'Unnamed student',
  department: student.department_name || (student.department_id ? `Department ${student.department_id}` : 'General Studies'),
  departmentName: student.department_name || '',
  departmentCode: student.department_code || '',
  year: student.admission_year ?? '',
  status: normalizeStatus(student.status),
  statusValue: student.status ?? '',
  departmentId: student.department_id ?? null,
})

function App() {
  const [activeView, setActiveView] = useState('Dashboard')
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalState, setModalState] = useState({ open: false, mode: 'create' })
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiBaseUrl, setApiBaseUrl] = useState(API_BASE_URLS[0] || 'http://127.0.0.1:8000')
  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState({})
  const [feedback, setFeedback] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [settingsSection, setSettingsSection] = useState('Profile')

  const loadData = async () => {
    let lastError = null

    try {
      setLoading(true)
      setError('')

      for (const baseUrl of API_BASE_URLS) {
        try {
          const studentsResponse = await fetch(`${baseUrl}/students/`, {
            headers: { Accept: 'application/json' },
          })

          if (!studentsResponse.ok) {
            throw new Error('Unable to load students from the backend.')
          }

          const studentsPayload = await studentsResponse.json()
          const normalizedStudents = Array.isArray(studentsPayload) ? studentsPayload.map(normalizeStudent) : []

          const departmentsResponse = await fetch(`${baseUrl}/departments/`)
          if (!departmentsResponse.ok) {
            throw new Error('Unable to load departments from the backend.')
          }

          const departmentsPayload = await departmentsResponse.json()
          const normalizedDepartments = Array.isArray(departmentsPayload) ? departmentsPayload : []

          setApiBaseUrl(baseUrl)
          setStudents(normalizedStudents)
          setDepartments(normalizedDepartments)
          return
        } catch (err) {
          lastError = err
        }
      }

      throw lastError || new Error('Unable to load student data from the backend.')
    } catch (err) {
      setError(err.message || 'Unable to load student data from the backend.')
      setStudents([])
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const stats = useMemo(() => {
    const total = students.length
    const active = students.filter((student) => student.status === 'Active').length
    const graduated = students.filter((student) => student.status === 'Graduated').length
    const inactive = students.filter((student) => student.status === 'Inactive').length

    return [
      { label: 'Total Students', value: total, note: 'Across all programs' },
      { label: 'Active Students', value: active, note: 'Currently enrolled' },
      { label: 'Graduated', value: graduated, note: 'Completed studies' },
      { label: 'Inactive', value: inactive, note: 'On leave or paused' },
    ]
  }, [students])

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const combined = `${student.name} ${student.department} ${student.id} ${student.departmentCode}`.toLowerCase()
      const matchesSearch = combined.includes(searchTerm.toLowerCase())
      const matchesDepartment = departmentFilter === 'All' || student.departmentCode === departmentFilter
      const matchesStatus = statusFilter === 'All' || student.status === statusFilter
      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [departmentFilter, searchTerm, statusFilter, students])

  const departmentBreakdown = useMemo(() => {
    const order = ['ISE', 'CSE', 'AIML', 'ECE']
    return order.map((code) => ({
      code,
      count: students.filter((student) => student.departmentCode?.toUpperCase() === code).length,
    }))
  }, [students])

  const totalDepartmentCount = departmentBreakdown.reduce((sum, item) => sum + item.count, 0)

  const openCreateModal = () => {
    setModalState({ open: true, mode: 'create' })
    setSelectedStudent(null)
    setFormData(initialFormState)
    setFormErrors({})
    setFeedback(null)
  }

  const openViewModal = (student) => {
    setModalState({ open: true, mode: 'view' })
    setSelectedStudent(student)
    setFormData({
      student_id: student.id,
      name: student.name,
      department_id: student.departmentId ?? '',
      admission_year: student.year,
      status: student.statusValue || student.status.toUpperCase(),
    })
    setFormErrors({})
    setFeedback(null)
  }

  const openEditModal = (student) => {
    setModalState({ open: true, mode: 'edit' })
    setSelectedStudent(student)
    setFormData({
      student_id: student.id,
      name: student.name,
      department_id: student.departmentId ?? '',
      admission_year: student.year,
      status: student.statusValue || student.status.toUpperCase(),
    })
    setFormErrors({})
    setFeedback(null)
  }

  const closeModal = () => {
    setModalState({ open: false, mode: 'create' })
    setSelectedStudent(null)
    setIsSubmitting(false)
    setFormErrors({})
    setFeedback(null)
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((current) => ({ ...current, [name]: value }))

    if (formErrors[name]) {
      setFormErrors((current) => ({ ...current, [name]: undefined }))
    }
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!formData.student_id.trim()) {
      nextErrors.student_id = 'Student ID is required.'
    }

    if (!formData.name.trim()) {
      nextErrors.name = 'Name is required.'
    }

    if (!formData.department_id) {
      nextErrors.department_id = 'Department is required.'
    }

    if (!formData.admission_year.trim()) {
      nextErrors.admission_year = 'Admission year is required.'
    } else {
      const numericValue = Number(formData.admission_year)
      if (!Number.isInteger(numericValue) || numericValue < 1900 || numericValue > 2100) {
        nextErrors.admission_year = 'Admission year must be a valid year.'
      }
    }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleCreateOrUpdate = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload = {
        student_id: formData.student_id.trim(),
        name: formData.name.trim(),
        department_id: Number(formData.department_id),
        admission_year: Number(formData.admission_year),
        status: formData.status.trim().toUpperCase() || 'ACTIVE',
      }

      const url = modalState.mode === 'edit' && selectedStudent
        ? `${apiBaseUrl}/students/${encodeURIComponent(selectedStudent.id)}`
        : `${apiBaseUrl}/students/`
      const method = modalState.mode === 'edit' && selectedStudent ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()
      let parsedResponse = null

      try {
        parsedResponse = responseText ? JSON.parse(responseText) : null
      } catch {
        parsedResponse = null
      }

      if (!response.ok) {
        const detail = parsedResponse?.detail || parsedResponse?.message || 'Unable to save student.'
        throw new Error(detail)
      }

      setFeedback({ type: 'success', text: modalState.mode === 'edit' ? 'Student updated successfully.' : 'Student created successfully.' })
      await loadData()
      closeModal()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Unable to save student.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/students/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Unable to delete student.')
      }

      setFeedback({ type: 'success', text: 'Student deleted successfully.' })
      await loadData()
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Unable to delete student.' })
    } finally {
      setDeleteTarget(null)
    }
  }

  const renderDashboard = () => (
    <>
      <header className="top-bar">
        <div>
          <p className="eyebrow">UNIVERSITY OPERATIONS</p>
          <h1>Good afternoon</h1>
          <p className="subtitle">Here&apos;s what&apos;s happening across your student records.</p>
        </div>
        <div className="top-bar-actions">
          <div className="pill">{new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
          <button className="primary-btn" type="button" onClick={openCreateModal}>Add Student</button>
        </div>
      </header>

      <section className="hero-grid" aria-label="Dashboard overview">
        <div className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">STUDENT PROFILE MANAGEMENT</p>
            <h2>Calm, precise administration for every academic record.</h2>
            <p>Monitor student profiles, department distribution, and operational status from a single premium workspace.</p>
          </div>
          <div className="hero-chip-row">
            <span className="chip">Live API</span>
            <span className="chip">Real records</span>
            <span className="chip">Secure flow</span>
          </div>
        </div>

        <div className="hero-card compact">
          <div className="mini-card">
            <span className="mini-label">Current view</span>
            <strong>Dashboard</strong>
          </div>
          <div className="mini-card">
            <span className="mini-label">Active roster</span>
            <strong>{students.length} students</strong>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Student statistics">
        {stats.map((stat, index) => (
          <article key={stat.label} className="stat-card" style={{ animationDelay: `${index * 80}ms` }}>
            <div className="stat-icon" aria-hidden="true">◌</div>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.note}</small>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="glass-panel overview-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">DEPARTMENT DISTRIBUTION</p>
              <h3>Student overview</h3>
            </div>
            <button className="ghost-btn" type="button" onClick={() => setActiveView('Students')}>View all</button>
          </div>

          <div className="overview-layout">
            <div className="donut-wrap" aria-label="Department distribution">
              <div
                className="donut"
                style={{
                  background: `conic-gradient(#f5f5f5 0 ${Math.round((totalDepartmentCount / Math.max(students.length, 1)) * 360)}deg, rgba(255,255,255,0.16) ${Math.round((totalDepartmentCount / Math.max(students.length, 1)) * 360)}deg 360deg)`,
                }}
              >
                <div className="donut-inner">
                  <strong>{students.length}</strong>
                  <span>Students</span>
                </div>
              </div>
            </div>

            <div className="legend-list">
              {departmentBreakdown.map((item) => (
                <div className="legend-item" key={item.code}>
                  <span className="legend-swatch" />
                  <div>
                    <strong>{item.code}</strong>
                    <p>{item.count} students</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="glass-panel actions-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">QUICK ACTIONS</p>
              <h3>Operational controls</h3>
            </div>
          </div>

          <div className="action-grid">
            <button className="action-card" type="button" onClick={openCreateModal}>
              <span>＋</span>
              <strong>Add Student</strong>
            </button>
            <button className="action-card" type="button" onClick={() => setActiveView('Reports')}>
              <span>◧</span>
              <strong>Generate Report</strong>
            </button>
            <button className="action-card" type="button" onClick={() => setActiveView('Settings')}>
              <span>⚙</span>
              <strong>Manage Settings</strong>
            </button>
          </div>
        </article>
      </section>

      <section className="glass-panel table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">RECENT STUDENTS</p>
            <h3>Live roster</h3>
          </div>
          <button className="ghost-btn" type="button" onClick={() => setActiveView('Students')}>View all</button>
        </div>

        {feedback && (
          <div className={`feedback-bar ${feedback.type}`}>{feedback.text}</div>
        )}

        <div className="table-shell">
          <div className="table-head">
            <span>Student ID</span>
            <span>Name</span>
            <span>Program</span>
            <span>Department</span>
            <span>Status</span>
            <span>Academic Year</span>
          </div>

          {loading && <div className="empty-state">Loading the latest student records…</div>}
          {!loading && error && <div className="empty-state">{error}</div>}
          {!loading && !error && filteredStudents.slice(0, 6).map((student) => (
            <div className="table-row" key={student.id}>
              <span className="mono">{student.id}</span>
              <span>{student.name}</span>
              <span>{student.departmentCode || 'General'}</span>
              <span>{student.departmentName || student.department}</span>
              <span><span className={`status-pill ${student.status.toLowerCase()}`}>{student.status}</span></span>
              <span>{student.year}</span>
            </div>
          ))}
          {!loading && !error && filteredStudents.length === 0 && <div className="empty-state">No students match the current filters.</div>}
        </div>
      </section>
    </>
  )

  const renderStudentsView = () => (
    <>
      <header className="top-bar">
        <div>
          <p className="eyebrow">STUDENT OPERATIONS</p>
          <h1>Students</h1>
          <p className="subtitle">A refined roster for admissions, department visibility, and academic status.</p>
        </div>
        <button className="primary-btn" type="button" onClick={openCreateModal}>Add Student</button>
      </header>

      <section className="glass-panel filter-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">FILTERS</p>
            <h3>Student roster</h3>
          </div>
        </div>

        <div className="toolbar">
          <label className="search-box" htmlFor="student-search">
            <span>⌕</span>
            <input id="student-search" type="text" placeholder="Search by name, ID or department" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </label>

          <label className="select-pill">
            <span>Department</span>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="All">All</option>
              {departments.map((department) => (
                <option key={department.id} value={department.code?.toUpperCase() || ''}>{department.code}</option>
              ))}
            </select>
          </label>

          <label className="select-pill">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Graduated">Graduated</option>
            </select>
          </label>
        </div>
      </section>

      <section className="glass-panel table-panel">
        {feedback && <div className={`feedback-bar ${feedback.type}`}>{feedback.text}</div>}
        <div className="table-shell">
          <div className="table-head">
            <span>Student ID</span>
            <span>Name</span>
            <span>Program</span>
            <span>Department</span>
            <span>Academic Year</span>
            <span>Semester</span>
            <span>Admission Year</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {loading && <div className="empty-state">Loading students from the API…</div>}
          {!loading && error && <div className="empty-state">{error}</div>}
          {!loading && !error && filteredStudents.map((student) => (
            <div className="table-row" key={student.id}>
              <span className="mono">{student.id}</span>
              <span>{student.name}</span>
              <span>{student.departmentCode || 'General'}</span>
              <span>{student.departmentName || student.department}</span>
              <span>{student.year}</span>
              <span>—</span>
              <span>{student.year}</span>
              <span><span className={`status-pill ${student.status.toLowerCase()}`}>{student.status}</span></span>
              <span className="action-stack">
                <button className="table-action" type="button" onClick={() => openViewModal(student)}>View</button>
                <button className="table-action" type="button" onClick={() => openEditModal(student)}>Edit</button>
                <button className="table-action danger" type="button" onClick={() => setDeleteTarget(student)}>Delete</button>
              </span>
            </div>
          ))}
          {!loading && !error && filteredStudents.length === 0 && <div className="empty-state">No students match the current search or filters.</div>}
        </div>
      </section>
    </>
  )

  const renderReportsView = () => {
    const active = students.filter((student) => student.status === 'Active').length
    const graduated = students.filter((student) => student.status === 'Graduated').length
    const inactive = students.filter((student) => student.status === 'Inactive').length

    return (
      <>
        <header className="top-bar">
          <div>
            <p className="eyebrow">ACCREDITATION INSIGHTS</p>
            <h1>Reports</h1>
            <p className="subtitle">Live summaries derived from the current student roster.</p>
          </div>
          <button className="primary-btn" type="button">Generate Report</button>
        </header>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Total students</span>
            <strong>{students.length}</strong>
            <small>Current roster size</small>
          </article>
          <article className="stat-card">
            <span>Active</span>
            <strong>{active}</strong>
            <small>Currently enrolled</small>
          </article>
          <article className="stat-card">
            <span>Graduated</span>
            <strong>{graduated}</strong>
            <small>Completed studies</small>
          </article>
          <article className="stat-card">
            <span>Inactive</span>
            <strong>{inactive}</strong>
            <small>Paused or inactive</small>
          </article>
        </section>

        <section className="content-grid">
          <article className="glass-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">DEPARTMENT SNAPSHOT</p>
                <h3>Distribution</h3>
              </div>
            </div>
            <div className="report-list">
              {departmentBreakdown.map((item) => (
                <div className="report-row" key={item.code}>
                  <span>{item.code}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="glass-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ACADEMIC YEAR VIEW</p>
                <h3>Admissions trend</h3>
              </div>
            </div>
            <div className="bar-chart" aria-label="Admissions year distribution">
              {Array.from(new Set(students.map((student) => student.year).filter(Boolean))).map((year) => {
                const count = students.filter((student) => student.year === year).length
                return (
                  <div className="bar-item" key={year}>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ height: `${Math.max(16, (count / Math.max(students.length, 1)) * 100)}%` }} />
                    </div>
                    <span>{year}</span>
                  </div>
                )
              })}
            </div>
          </article>
        </section>
      </>
    )
  }

  const renderSettingsView = () => (
    <>
      <header className="top-bar">
        <div>
          <p className="eyebrow">SYSTEM SETTINGS</p>
          <h1>Settings</h1>
          <p className="subtitle">Refined administrative controls with frontend-only preferences.</p>
        </div>
      </header>

      <section className="glass-panel settings-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PROFILE & PREFERENCES</p>
            <h3>Workplace defaults</h3>
          </div>
        </div>

        <div className="settings-grid">
          <article className="setting-card">
            <h4>Profile</h4>
            <p>Review the administrator workspace and current operations overview.</p>
            <button className="secondary-btn" type="button" onClick={() => setSettingsSection('Profile')}>Open section</button>
          </article>
          <article className="setting-card">
            <h4>Appearance</h4>
            <p>The interface now uses a lighter glass treatment with soft contrast and restrained motion.</p>
            <button className="secondary-btn" type="button" onClick={() => setSettingsSection('Appearance')}>Open section</button>
          </article>
          <article className="setting-card">
            <h4>Data</h4>
            <p>Student lists and reporting remain synchronized with the live FastAPI backend.</p>
            <button className="secondary-btn" type="button" onClick={() => setSettingsSection('Data')}>Open section</button>
          </article>
        </div>

        <div className="settings-content">
          <h4>{settingsSection}</h4>
          {settingsSection === 'Profile' && <p>The current workspace is optimized for university administration, reporting, and student records.</p>}
          {settingsSection === 'Appearance' && <p>Glass surfaces use airy white layers, soft depth, and restrained motion for a premium experience.</p>}
          {settingsSection === 'Data' && <p>The dashboard, roster, and reports are derived from the live student records returned by the existing API.</p>}
        </div>
      </section>
    </>
  )

  const renderView = () => {
    switch (activeView) {
      case 'Students':
        return renderStudentsView()
      case 'Reports':
        return renderReportsView()
      case 'Settings':
        return renderSettingsView()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">E</div>
          <div>
            <strong>EduTrack</strong>
            <p>University Operations</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Sidebar navigation">
          {sidebarItems.map((item) => (
            <button key={item} className={`nav-item ${activeView === item ? 'active' : ''}`} type="button" onClick={() => setActiveView(item)}>
              <span className="nav-icon">◦</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card-label">Operational pulse</p>
          <strong>{students.length}</strong>
          <span>student profiles currently visible</span>
        </div>

        <div className="sidebar-footer">
          <div className="avatar-circle">A</div>
          <div>
            <strong>Administrator</strong>
            <p>System access</p>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        {renderView()}
      </main>

      {modalState.open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="student-modal-title">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">{modalState.mode === 'view' ? 'Student profile' : modalState.mode === 'edit' ? 'Edit student' : 'Add student'}</p>
                <h3 id="student-modal-title">{modalState.mode === 'view' ? (selectedStudent?.name || 'Student profile') : modalState.mode === 'edit' ? 'Update student profile' : 'Create student profile'}</h3>
              </div>
              <button className="modal-close" type="button" onClick={closeModal}>✕</button>
            </div>

            {modalState.mode === 'view' && selectedStudent ? (
              <div className="detail-list">
                <div className="detail-row"><span>Student ID</span><strong>{selectedStudent.id}</strong></div>
                <div className="detail-row"><span>Name</span><strong>{selectedStudent.name}</strong></div>
                <div className="detail-row"><span>Department</span><strong>{selectedStudent.departmentName || selectedStudent.department}</strong></div>
                <div className="detail-row"><span>Academic Year</span><strong>{selectedStudent.year}</strong></div>
                <div className="detail-row"><span>Status</span><strong>{selectedStudent.status}</strong></div>
              </div>
            ) : (
              <form className="student-form" onSubmit={handleCreateOrUpdate}>
                <div className="form-grid">
                  <label className="field">
                    <span>Student ID</span>
                    <input type="text" name="student_id" value={formData.student_id} onChange={handleInputChange} placeholder="ST-####" />
                    {formErrors.student_id && <small>{formErrors.student_id}</small>}
                  </label>

                  <label className="field">
                    <span>Name</span>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Full name" />
                    {formErrors.name && <small>{formErrors.name}</small>}
                  </label>

                  <label className="field">
                    <span>Department</span>
                    <select name="department_id" value={formData.department_id} onChange={handleInputChange}>
                      <option value="">Select department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.code} — {department.name}</option>
                      ))}
                    </select>
                    {formErrors.department_id && <small>{formErrors.department_id}</small>}
                  </label>

                  <label className="field">
                    <span>Admission Year</span>
                    <input type="number" name="admission_year" value={formData.admission_year} onChange={handleInputChange} placeholder="2025" />
                    {formErrors.admission_year && <small>{formErrors.admission_year}</small>}
                  </label>

                  <label className="field">
                    <span>Status</span>
                    <select name="status" value={formData.status} onChange={handleInputChange}>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="GRADUATED">GRADUATED</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </label>
                </div>

                {feedback && <div className={`feedback-bar ${feedback.type}`}>{feedback.text}</div>}

                <div className="modal-actions">
                  <button className="secondary-btn" type="button" onClick={closeModal}>Cancel</button>
                  <button className="primary-btn" type="submit" disabled={isSubmitting}>{isSubmitting ? (modalState.mode === 'edit' ? 'Saving…' : 'Creating…') : (modalState.mode === 'edit' ? 'Save changes' : 'Create student')}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card confirm-card">
            <p className="eyebrow">Confirm deletion</p>
            <h3>Delete {deleteTarget.name}?</h3>
            <p>This action removes the student profile from the live API roster.</p>
            <div className="modal-actions">
              <button className="secondary-btn" type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="primary-btn danger" type="button" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
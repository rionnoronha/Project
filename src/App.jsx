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
  const [filterStatus, setFilterStatus] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiBaseUrl, setApiBaseUrl] = useState(API_BASE_URLS[0] || 'http://127.0.0.1:8000')
  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState({})
  const [submitStatus, setSubmitStatus] = useState(null)
  const [deleteState, setDeleteState] = useState({})

  const loadStudents = async () => {
    let lastError = null

    try {
      setLoading(true)
      setError('')

      for (const baseUrl of API_BASE_URLS) {
        try {
          const response = await fetch(`${baseUrl}/students/`, {
            headers: {
              Accept: 'application/json',
            },
          })

          if (!response.ok) {
            throw new Error('Unable to load students from the backend.')
          }

          const data = await response.json()
          const normalizedStudents = Array.isArray(data) ? data.map(normalizeStudent) : []
          setApiBaseUrl(baseUrl)
          setStudents(normalizedStudents)
          return
        } catch (err) {
          lastError = err
        }
      }

      throw lastError || new Error('Unable to load students from the backend.')
    } catch (err) {
      setError(err.message || 'Unable to load students from the backend.')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }

  const loadDepartments = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/departments/`)
      if (!response.ok) {
        throw new Error('Unable to load departments from the backend.')
      }
      const data = await response.json()
      setDepartments(Array.isArray(data) ? data : [])
    } catch {
      setDepartments([])
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  useEffect(() => {
    if (apiBaseUrl) {
      loadDepartments()
    }
  }, [apiBaseUrl])

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
      const query = `${student.name} ${student.department} ${student.id}`.toLowerCase()
      const matchesSearch = query.includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'All' || student.status === filterStatus
      return matchesSearch && matchesFilter
    })
  }, [filterStatus, searchTerm, students])

  const openModal = () => {
    setShowModal(true)
    setFormData(initialFormState)
    setFormErrors({})
    setSubmitStatus(null)
  }

  const closeModal = () => {
    setShowModal(false)
    setIsSubmitting(false)
    setFormErrors({})
    setSubmitStatus(null)
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

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const payload = {
        student_id: formData.student_id.trim(),
        name: formData.name.trim(),
        department_id: Number(formData.department_id),
        admission_year: Number(formData.admission_year),
        status: formData.status.trim().toUpperCase() || 'ACTIVE',
      }

      const response = await fetch(`${apiBaseUrl}/students/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        const detail = parsedResponse?.detail || parsedResponse?.message || 'Unable to create student.'
        throw new Error(detail)
      }

      setSubmitStatus({ type: 'success', text: 'Student created successfully.' })
      setShowModal(false)
      await loadStudents()
    } catch (err) {
      setSubmitStatus({ type: 'error', text: err.message || 'Unable to create student.' })
      setShowModal(true)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (studentId) => {
    const confirmed = window.confirm(`Delete ${studentId}?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/students/${encodeURIComponent(studentId)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Unable to delete student.')
      }

      setDeleteState({ type: 'success', text: 'Student deleted successfully.' })
      await loadStudents()
    } catch (err) {
      setDeleteState({ type: 'error', text: err.message || 'Unable to delete student.' })
    }
  }

  const cycleFilter = () => {
    const order = ['All', 'Active', 'Graduated', 'Inactive']
    const currentIndex = order.indexOf(filterStatus)
    const nextIndex = (currentIndex + 1) % order.length
    setFilterStatus(order[nextIndex])
  }

  const renderDashboard = () => (
    <>
      <header className="top-bar">
        <div>
          <p className="eyebrow">UNIVERSITY OPERATIONS</p>
          <h1>Good afternoon</h1>
          <p className="subtitle">Here&apos;s what&apos;s happening across your student records.</p>
        </div>
        <button className="primary-btn" type="button" onClick={openModal}>
          Add Student
        </button>
      </header>

      <section className="stats-grid" aria-label="Student statistics">
        {stats.map((stat, index) => (
          <article key={stat.label} className="stat-card" style={{ animationDelay: `${index * 80}ms` }}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.note}</small>
          </article>
        ))}
      </section>

      <section className="students-panel">
        <div className="panel-header">
          <div>
            <h2>Students</h2>
            <p>Track admissions, status, and academic progress.</p>
          </div>

          <div className="panel-actions">
            <label className="search-box" htmlFor="student-search">
              <span>⌕</span>
              <input
                id="student-search"
                type="text"
                placeholder="Search students"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button className="secondary-btn" type="button" onClick={cycleFilter}>
              Filter: {filterStatus}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          {submitStatus && (
            <div className={`status-banner ${submitStatus.type}`}>
              {submitStatus.text}
            </div>
          )}

          <div className="table-head">
            <span>Student ID</span>
            <span>Name</span>
            <span>Department</span>
            <span>Admission Year</span>
            <span>Status</span>
          </div>

          {loading && (
            <div className="empty-state">Loading students from the API…</div>
          )}

          {!loading && error && (
            <div className="empty-state">{error}</div>
          )}

          {!loading && !error && filteredStudents.map((student) => (
            <div className="table-row" key={student.id}>
              <span className="mono">{student.id}</span>
              <div className="student-name">
                <div className="avatar">{student.name.charAt(0)}</div>
                <div>
                  <strong>{student.name}</strong>
                  <p>{student.department}</p>
                </div>
              </div>
              <span>{student.department}</span>
              <span>{student.year}</span>
              <span className="status-cell">
                <span className={`status-pill ${student.status.toLowerCase()}`}>{student.status}</span>
                <button className="delete-btn" type="button" onClick={() => handleDelete(student.id)}>
                  Delete
                </button>
              </span>
            </div>
          ))}

          {!loading && !error && filteredStudents.length === 0 && (
            <div className="empty-state">
              No students match that search yet.
            </div>
          )}
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
          <p className="subtitle">Manage admissions, departments, and current academic status.</p>
        </div>
        <button className="primary-btn" type="button" onClick={openModal}>
          Add Student
        </button>
      </header>

      <section className="students-panel">
        <div className="panel-header">
          <div>
            <h2>Student roster</h2>
            <p>Search, filter, and manage the active student list.</p>
          </div>

          <div className="panel-actions">
            <label className="search-box" htmlFor="students-view-search">
              <span>⌕</span>
              <input
                id="students-view-search"
                type="text"
                placeholder="Search students"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <button className="secondary-btn" type="button" onClick={cycleFilter}>
              Filter: {filterStatus}
            </button>
          </div>
        </div>

        <div className="table-wrap">
          {deleteState && (
            <div className={`status-banner ${deleteState.type}`}>
              {deleteState.text}
            </div>
          )}

          <div className="table-head">
            <span>Student ID</span>
            <span>Name</span>
            <span>Department</span>
            <span>Admission Year</span>
            <span>Status</span>
          </div>

          {loading && (
            <div className="empty-state">Loading students from the API…</div>
          )}

          {!loading && error && (
            <div className="empty-state">{error}</div>
          )}

          {!loading && !error && filteredStudents.map((student) => (
            <div className="table-row" key={student.id}>
              <span className="mono">{student.id}</span>
              <div className="student-name">
                <div className="avatar">{student.name.charAt(0)}</div>
                <div>
                  <strong>{student.name}</strong>
                  <p>{student.department}</p>
                </div>
              </div>
              <span>{student.department}</span>
              <span>{student.year}</span>
              <span className="status-cell">
                <span className={`status-pill ${student.status.toLowerCase()}`}>{student.status}</span>
                <button className="delete-btn" type="button" onClick={() => handleDelete(student.id)}>
                  Delete
                </button>
              </span>
            </div>
          ))}

          {!loading && !error && filteredStudents.length === 0 && (
            <div className="empty-state">
              No students match that search yet.
            </div>
          )}
        </div>
      </section>
    </>
  )

  const renderReportsView = () => {
    const active = students.filter((student) => student.status === 'Active').length
    const graduated = students.filter((student) => student.status === 'Graduated').length
    const inactive = students.filter((student) => student.status === 'Inactive').length
    const byDepartment = departments.map((department) => ({
      ...department,
      count: students.filter((student) => student.departmentId === department.id).length,
    }))

    return (
      <>
        <header className="top-bar">
          <div>
            <p className="eyebrow">ACCREDITATION INSIGHTS</p>
            <h1>Reports</h1>
            <p className="subtitle">Administrative summaries derived from the live student roster.</p>
          </div>
        </header>

        <section className="stats-grid" aria-label="Reports summaries">
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

        <section className="students-panel">
          <div className="panel-header">
            <div>
              <h2>Department distribution</h2>
              <p>Actual student counts based on the existing department relationship.</p>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-head">
              <span>Department</span>
              <span>Code</span>
              <span>Students</span>
            </div>
            {byDepartment.map((department) => (
              <div className="table-row" key={department.id}>
                <span>{department.name}</span>
                <span className="mono">{department.code}</span>
                <span>{department.count}</span>
              </div>
            ))}
          </div>
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
          <p className="subtitle">Administrative preferences and operational defaults.</p>
        </div>
      </header>

      <section className="students-panel">
        <div className="panel-header">
          <div>
            <h2>Administration controls</h2>
            <p>Manage the student platform without changing the dashboard experience.</p>
          </div>
        </div>

        <div className="settings-grid">
          <article className="setting-card">
            <h3>Academic defaults</h3>
            <p>Keep student enrollment workflows aligned with the current program structure.</p>
            <button className="secondary-btn" type="button">Review defaults</button>
          </article>
          <article className="setting-card">
            <h3>Department mapping</h3>
            <p>Departments are managed through the existing database relationship and remain consistent across the app.</p>
            <button className="secondary-btn" type="button">View department list</button>
          </article>
          <article className="setting-card">
            <h3>Notifications</h3>
            <p>Student status updates and approvals can be surfaced through the admin dashboard.</p>
            <button className="secondary-btn" type="button">Configure alerts</button>
          </article>
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
            <p>Student hub</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="Sidebar navigation">
          {sidebarItems.map((item) => (
            <button
              key={item}
              className={`nav-item ${activeView === item ? 'active' : ''}`}
              type="button"
              onClick={() => setActiveView(item)}
            >
              <span className="nav-icon">•</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card-label">Enrollment snapshot</p>
          <strong>94.8%</strong>
          <span>Retention rate this term</span>
        </div>
      </aside>

      <main className="main-panel">
        {renderView()}
      </main>

      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-student-title">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">ADD NEW STUDENT</p>
                <h3 id="add-student-title">Create student profile</h3>
              </div>
              <button className="modal-close" type="button" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form className="student-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>Student ID</span>
                  <input
                    type="text"
                    name="student_id"
                    value={formData.student_id}
                    onChange={handleInputChange}
                    placeholder="ST-####"
                  />
                  {formErrors.student_id && <small>{formErrors.student_id}</small>}
                </label>

                <label className="field">
                  <span>Name</span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Full name"
                  />
                  {formErrors.name && <small>{formErrors.name}</small>}
                </label>

                <label className="field">
                  <span>Department</span>
                  <select name="department_id" value={formData.department_id} onChange={handleInputChange}>
                    <option value="">Select department</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.code} — {department.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.department_id && <small>{formErrors.department_id}</small>}
                </label>

                <label className="field">
                  <span>Admission Year</span>
                  <input
                    type="number"
                    name="admission_year"
                    value={formData.admission_year}
                    onChange={handleInputChange}
                    placeholder="2025"
                  />
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

              <div className="modal-actions">
                <button className="secondary-btn" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="primary-btn" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
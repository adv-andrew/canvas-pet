import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string

interface ShopItem {
  id: string
  name: string
  description: string | null
  cost: number
  image_url: string | null
  active: boolean
  created_at: string
}

interface UserStats {
  id: string
  canvas_user_id: string
  display_name: string | null
  email: string | null
  role: string
  happiness_score: number
  reward_points: number
  streak: number
}

type Tab = 'shop' | 'users'

export function Admin() {
  const [tab, setTab] = useState<Tab>('shop')
  const [items, setItems] = useState<ShopItem[]>([])
  const [users, setUsers] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [newItem, setNewItem] = useState({ name: '', description: '', cost: 0 })
  const [adding, setAdding] = useState(false)

  async function getToken() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function checkAdmin() {
    const token = await getToken()
    if (!token) return false
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const [shopRes, usersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/shop`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${BACKEND_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!shopRes.ok || !usersRes.ok) {
        throw new Error('Admin access required')
      }

      const shopData = await shopRes.json()
      const usersData = await usersRes.json()

      setItems(shopData.data || [])
      setUsers(usersData.data || [])
      setIsAdmin(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAdmin().then((admin) => {
      if (admin) {
        loadData()
      } else {
        setIsAdmin(false)
        setLoading(false)
        setError('Admin access required')
      }
    })
  }, [])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    try {
      const token = await getToken()
      const res = await fetch(`${BACKEND_URL}/api/admin/shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newItem),
      })
      if (!res.ok) throw new Error('Failed to add item')
      setNewItem({ name: '', description: '', cost: 0 })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  async function handleToggleActive(itemId: string, active: boolean) {
    try {
      const token = await getToken()
      const res = await fetch(`${BACKEND_URL}/api/admin/shop/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !active }),
      })
      if (!res.ok) throw new Error('Failed to update')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm('Delete this item?')) return
    try {
      const token = await getToken()
      const res = await fetch(`${BACKEND_URL}/api/admin/shop/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="page-content">
        <h2 className="page-title">Admin Panel</h2>
        <div className="admin-denied">
          <p>You don't have admin access.</p>
          <p>Contact an administrator to get access.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content admin-page">
      <h2 className="page-title">Admin Panel</h2>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'shop' ? 'active' : ''}`}
          onClick={() => setTab('shop')}
        >
          Shop Items ({items.length})
        </button>
        <button
          className={`admin-tab ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users ({users.length})
        </button>
      </div>

      {tab === 'shop' && (
        <>
          <form className="admin-add-form" onSubmit={handleAddItem}>
            <input
              type="text"
              placeholder="Item name"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            />
            <input
              type="number"
              placeholder="Cost"
              value={newItem.cost}
              onChange={(e) => setNewItem({ ...newItem, cost: parseInt(e.target.value) || 0 })}
              min={0}
              required
            />
            <button type="submit" disabled={adding}>
              {adding ? 'Adding...' : 'Add Item'}
            </button>
          </form>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Cost</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className={item.active ? '' : 'inactive'}>
                    <td>{item.name}</td>
                    <td>{item.description || '-'}</td>
                    <td>{item.cost} RP</td>
                    <td>
                      <button
                        className={`toggle-btn ${item.active ? 'on' : 'off'}`}
                        onClick={() => handleToggleActive(item.id, item.active)}
                      >
                        {item.active ? 'Yes' : 'No'}
                      </button>
                    </td>
                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'users' && (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Happiness</th>
                <th>Points</th>
                <th>Streak</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.display_name || user.canvas_user_id}</td>
                  <td>{user.email || '-'}</td>
                  <td>
                    <span className={`role-badge role-${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.happiness_score}%</td>
                  <td>{user.reward_points} RP</td>
                  <td>{user.streak} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

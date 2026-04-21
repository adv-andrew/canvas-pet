import { useEffect, useState } from 'react'
import {
  apiClientGetShopItems,
  apiClientGetOwnedItems,
  apiClientPurchaseItem,
  apiClientGetPetStats,
  type ShopItem,
  type OwnedItem,
} from '../../shared/lib/apiClient'
import { supabase } from '../lib/supabaseClient'

type Tab = 'shop' | 'owned'

export function Shop() {
  const [tab, setTab] = useState<Tab>('shop')
  const [items, setItems] = useState<ShopItem[]>([])
  const [owned, setOwned] = useState<OwnedItem[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [costSort, setCostSort] = useState<'default' | 'low-high' | 'high-low'>('default')
  const [onlyAffordable, setOnlyAffordable] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const token = session.access_token

        const [shopItems, ownedItems, stats] = await Promise.all([
          apiClientGetShopItems(token),
          apiClientGetOwnedItems(token),
          apiClientGetPetStats(token),
        ])

        setItems(shopItems)
        setOwned(ownedItems)
        setBalance(stats.reward_points)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const ownedIds = new Set(owned.map((o) => o.item_id))

  const displayedItems = [...items]
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((item) => !onlyAffordable || item.cost <= balance)
    .sort((a, b) => {
      if (costSort === 'low-high') return a.cost - b.cost
      if (costSort === 'high-low') return b.cost - a.cost
      return 0
    })

  const handlePurchase = async (itemId: string) => {
    setPurchasing(itemId)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const result = await apiClientPurchaseItem(itemId, session.access_token)
      setBalance(result.reward_points)

      const ownedItems = await apiClientGetOwnedItems(session.access_token)
      setOwned(ownedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="shop-header">
        <h2 className="page-title">Shop</h2>
        <div className="shop-balance">
          <span>⭐</span>
          <span>{balance} RP</span>
        </div>
      </div>

      {error && (
        <div className="home-error" style={{ marginBottom: 16 }}>{error}</div>
      )}

      <div className="shop-tabs">
        <button
          className={`shop-tab ${tab === 'shop' ? 'active' : ''}`}
          onClick={() => setTab('shop')}
        >
          Available Items
        </button>
        <button
          className={`shop-tab ${tab === 'owned' ? 'active' : ''}`}
          onClick={() => setTab('owned')}
        >
          My Items ({owned.length})
        </button>
      </div>

        {tab === 'shop' && (
          <>
            <div className="shop-controls">
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="shop-search"
              />

              <select
                value={costSort}
                onChange={(e) =>
                  setCostSort(e.target.value as 'default' | 'low-high' | 'high-low')
                }
                className="shop-sort"
              >
                <option value="default">Sort by</option>
                <option value="low-high">Cost: Low to High</option>
                <option value="high-low">Cost: High to Low</option>
              </select>

              <label className="shop-checkbox">
                <input
                  type="checkbox"
                  checked={onlyAffordable}
                  onChange={(e) => setOnlyAffordable(e.target.checked)}
                />
                Only affordable
              </label>
            </div>

            <div className="shop-grid">
              {displayedItems.length === 0 && (
                <div className="shop-empty">
                  No matching items found.
                </div>
              )}

              {displayedItems.map((item) => {
                const isOwned = ownedIds.has(item.id)
                const canAfford = balance >= item.cost
                const isPurchasing = purchasing === item.id

                return (
                  <div key={item.id} className={`shop-item ${isOwned ? 'owned' : ''}`}>
                    <div className="shop-item-image">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} />
                      ) : (
                        '🎁'
                      )}
                    </div>
                    <div className="shop-item-name">{item.name}</div>
                    {item.description && (
                      <div className="shop-item-desc">{item.description}</div>
                    )}
                    <div className="shop-item-cost">
                      <span>⭐</span>
                      <span>{item.cost}</span>
                    </div>
                    {isOwned ? (
                      <div className="shop-owned-badge">Owned ✓</div>
                    ) : (
                      <button
                        className="shop-buy-btn"
                        onClick={() => handlePurchase(item.id)}
                        disabled={!canAfford || isPurchasing}
                      >
                        {isPurchasing ? 'Buying...' : canAfford ? 'Buy' : 'Not enough RP'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

      {tab === 'owned' && (
        <div className="shop-grid">
          {owned.length === 0 && (
            <div className="shop-empty">
              You don't own any items yet. Complete assignments to earn points!
            </div>
          )}

          {owned.map((item) => (
            <div key={item.item_id} className="shop-item owned">
              <div className="shop-item-image">
                {item.shop_items.image_url ? (
                  <img src={item.shop_items.image_url} alt={item.shop_items.name} />
                ) : (
                  '🎁'
                )}
              </div>

              <div className="shop-item-name">{item.shop_items.name}</div>

              {item.shop_items.description && (
                <div className="shop-item-desc">{item.shop_items.description}</div>
              )}

              <div className="shop-owned-badge">Owned ✓</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

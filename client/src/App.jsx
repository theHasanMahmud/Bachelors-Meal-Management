import { useCallback, useEffect, useMemo, useState } from 'react'

function currency(n) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'BDT',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(n || 0)
}

function formatDate(isoDate) {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const STORAGE_KEY_PURCHASES = 'meal_mgmt_purchases'
const STORAGE_KEY_MEMBERS = 'meal_mgmt_members'
const STORAGE_KEY_MEALS = 'meal_mgmt_meals'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function loadPurchasesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PURCHASES)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function savePurchasesToStorage(purchases) {
  localStorage.setItem(STORAGE_KEY_PURCHASES, JSON.stringify(purchases))
}

function loadMembersFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMembersToStorage(members) {
  localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members))
}

function loadMealsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEALS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMealsToStorage(meals) {
  localStorage.setItem(STORAGE_KEY_MEALS, JSON.stringify(meals))
}

export default function App() {
  const [form, setForm] = useState({
    itemName: '',
    quantity: 1,
    price: '',
    purchasedAt: todayStr(),
    category: null,
    unit: '', // Unit field (KG, Gram, Liter, etc.)
    aiInput: '', // AI input text
    parsedItems: [], // Parsed items from AI input
    isParsing: false, // Loading state for parsing
    // Masala items with costs and exclusions
    masalaItems: {
      onion: { cost: '' },
      potato: { cost: '' },
      turmeric: { cost: '' },
      chili: { cost: '' },
      ginger: { cost: '' },
      garlic: { cost: '' },
      chickenMasala: { cost: '' },
      oil: { cost: '' },
      tomato: { cost: '' },
      goromMasala: { cost: '' }
    }
  })
  const [purchases, setPurchases] = useState(loadPurchasesFromStorage)
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState(loadMembersFromStorage)
  const [newMemberName, setNewMemberName] = useState('')
  const [mealDate, setMealDate] = useState(todayStr())
  const [dailyMeals, setDailyMeals] = useState([])
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [editForm, setEditForm] = useState({
    itemName: '',
    category: '',
    purchasedAt: '',
    quantity: 1,
    unit: '',
    price: ''
  })

  // Use actual purchases as shopping list
  const shoppingList = useMemo(() => {
    return purchases.map(p => ({ id: p._id, name: p.itemName }))
  }, [purchases])

  const [mealEntry, setMealEntry] = useState({
    memberId: '',
    itemId: '',
    mealCount: 1,
  })

  // Track which members have expanded meal history
  const [expandedMembers, setExpandedMembers] = useState(new Set())
  // Track which members have expanded cost breakdown
  const [expandedCostBreakdown, setExpandedCostBreakdown] = useState(new Set())

  // Reporting range
  const [reportStart, setReportStart] = useState(todayStr())
  const [reportEnd, setReportEnd] = useState(todayStr())
  const totals = useMemo(() => {
    const totalQuantity = purchases.reduce((sum, p) => sum + Number(p.quantity), 0)
    const totalAmount = purchases.reduce((sum, p) => sum + Number(p.price), 0) // Price is now total price
    return { totalQuantity, totalAmount }
  }, [purchases])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? purchases.filter((p) => p.itemName.toLowerCase().includes(q)) : purchases
  }, [purchases, query])

  const tableTotals = useMemo(() => {
    const totalQuantity = filtered.reduce((sum, p) => sum + Number(p.quantity), 0)
    const totalAmount = filtered.reduce((sum, p) => sum + Number(p.price), 0) // Price is now total price
    return { totalQuantity, totalAmount }
  }, [filtered])

  useEffect(() => {
    const initialMembers = members
    if (initialMembers.length > 0) {
      setMealEntry((prev) => ({ ...prev, memberId: initialMembers[0].id }))
    }
    // Reports default: current week
    const d = new Date()
    const day = d.getDay() || 7 // make Sunday 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setReportStart(monday.toISOString().slice(0, 10))
    setReportEnd(sunday.toISOString().slice(0, 10))
  }, [])

  // Update meal entry when members change
  useEffect(() => {
    if (members.length > 0 && !mealEntry.memberId) {
      setMealEntry(prev => ({ ...prev, memberId: members[0].id }))
    }
  }, [members, mealEntry.memberId])

  useEffect(() => {
    savePurchasesToStorage(purchases)
  }, [purchases])

  // Update meal entry item when purchases change
  useEffect(() => {
    if (purchases.length > 0 && !mealEntry.itemId) {
      setMealEntry(prev => ({ ...prev, itemId: purchases[0]._id }))
    }
  }, [purchases, mealEntry.itemId])

  useEffect(() => {
    saveMembersToStorage(members)
  }, [members])

  useEffect(() => {
    const savedForm = localStorage.getItem('masalaChaiForm')
    if (savedForm) {
      const parsed = JSON.parse(savedForm)
      // Ensure new fields are initialized if they don't exist in saved data
      setForm({
        ...parsed,
        aiInput: parsed.aiInput || '',
        parsedItems: parsed.parsedItems || [],
        isParsing: parsed.isParsing || false,
        unit: parsed.unit || '' // Initialize unit field
      })
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('masalaChaiForm', JSON.stringify(form))
  }, [form])

  function handleSubmit(e) {
    e.preventDefault()
    
    const newPurchase = {
      _id: (globalThis.crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
      itemName: form.itemName,
      quantity: form.quantity,
      price: Number(form.price),
      unit: form.unit || null,
      purchasedAt: form.purchasedAt,
      category: form.category || autoCategorizeItems(form.itemName), // Auto-categorize if no category selected
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    console.log('Adding purchase:', newPurchase)
    setPurchases((list) => {
      const newList = [newPurchase, ...list]
      console.log('New purchases list:', newList)
      return newList
    })
    
    // Reset only purchase-related fields, preserve masala calculation fields
    setForm(prev => ({ 
      ...prev,
      itemName: '', 
      quantity: 1, 
      price: '', 
      category: null,
      unit: '' // Reset unit field
    }))
  }

  // AI Input Parser Functions
  function parseAIInput() {
    const input = form.aiInput.trim()
    if (!input) return

    setForm(prev => ({ ...prev, isParsing: true }))

    // Simulate processing time for better UX
    setTimeout(() => {
      // Split by both newlines and commas, then filter empty lines
      const lines = input.split(/[\n,]+/).filter(line => line.trim())
      const parsedItems = []

      lines.forEach(line => {
        const item = parseLine(line)
        if (item) {
          parsedItems.push(item)
        }
      })

      if (parsedItems.length > 0) {
        setForm(prev => ({ ...prev, parsedItems, isParsing: false }))
      } else {
        setForm(prev => ({ ...prev, isParsing: false }))
        alert('No valid items found. Please check your input format.')
      }
    }, 500)
  }

  function parseLine(line) {
    // Remove extra spaces and normalize
    line = line.trim().replace(/\s+/g, ' ')
    console.log('Parsing line:', line)
    
    // More precise patterns with better group handling
    const patterns = [
      // Pattern 1: "item quantity unit = price currency" (e.g., "vat 5 kg = 500 tk")
      {
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*=\s*(\d+(?:\.\d+)?)\s*(tk|bdt|taka)$/i,
        groups: { itemName: 1, quantity: 2, unit: 3, price: 4, currency: 5 }
      },
      
      // Pattern 2: "item quantity unit price currency" (e.g., "vat 5kg 500 tk") - MAIN PATTERN
      {
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(\d+(?:\.\d+)?)\s*(tk|bdt|taka)$/i,
        groups: { itemName: 1, quantity: 2, unit: 3, price: 4, currency: 5 }
      },
      
      // Pattern 3: "item price currency quantity unit" (e.g., "vat 500 bdt 5 kg")
      {
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)\s*(tk|bdt|taka)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/i,
        groups: { itemName: 1, price: 2, currency: 3, quantity: 4, unit: 5 }
      },
      
      // Pattern 4: "item price currency" (e.g., "lobon 42 tk")
      {
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)\s*(tk|bdt|taka)$/i,
        groups: { itemName: 1, price: 2, currency: 3 }
      },
      
      // Pattern 5: "item = price" (e.g., "Salt = 42")
      {
        regex: /^(.+?)\s*=\s*(\d+(?:\.\d+)?)$/,
        groups: { itemName: 1, price: 2 }
      },
      
      // Pattern 6: "item price" (e.g., "Rice 270")
      {
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)$/,
        groups: { itemName: 1, price: 2 }
      },
      
      // Pattern 7: "item quantity unit price" (e.g., "Alu 1 KG 30")
      {
        regex: /^(.+?)\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(\d+(?:\.\d+)?)$/i,
        groups: { itemName: 1, quantity: 2, unit: 3, price: 4 }
      }
    ]

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i]
      const match = line.match(pattern.regex)
      console.log(`Pattern ${i + 1}:`, pattern.regex.source, 'Match:', match)
      
      if (match) {
        // Extract values based on the pattern's group mapping
        const itemName = match[pattern.groups.itemName]?.trim()
        const quantity = pattern.groups.quantity ? parseFloat(match[pattern.groups.quantity]) : 1
        const unit = pattern.groups.unit ? match[pattern.groups.unit] : null
        const price = pattern.groups.price ? parseFloat(match[pattern.groups.price]) : null
        const currency = pattern.groups.currency ? match[pattern.groups.currency] : null
        
        console.log('Extracted values:', { itemName, quantity, unit, price, currency })
        
        if (itemName && !isNaN(price) && price > 0) {
          // Clean up item name (remove extra spaces, capitalize first letter)
          const cleanItemName = itemName.replace(/\s+/g, ' ').trim()
          
          // Handle Bengali/English mixed names better
          let finalItemName
          if (cleanItemName.toLowerCase().includes('lobon')) finalItemName = 'Salt'
          else if (cleanItemName.toLowerCase().includes('chal')) finalItemName = 'Rice'
          else if (cleanItemName.toLowerCase().includes('alu')) finalItemName = 'Potato'
          else if (cleanItemName.toLowerCase().includes('peyaj')) finalItemName = 'Onion'
          else if (cleanItemName.toLowerCase().includes('tel')) finalItemName = 'Oil'
          else if (cleanItemName.toLowerCase().includes('holud')) finalItemName = 'Turmeric'
          else if (cleanItemName.toLowerCase().includes('morich')) finalItemName = 'Chili'
          else if (cleanItemName.toLowerCase().includes('ada')) finalItemName = 'Ginger'
          else if (cleanItemName.toLowerCase().includes('roshun')) finalItemName = 'Garlic'
          else if (cleanItemName.toLowerCase().includes('tomato')) finalItemName = 'Tomato'
          else if (cleanItemName.toLowerCase().includes('vat')) finalItemName = 'Rice'
          else if (cleanItemName.toLowerCase().includes('murgi') && !cleanItemName.toLowerCase().includes('moshla')) finalItemName = 'Chicken'
          else if (cleanItemName.toLowerCase().includes('chini')) finalItemName = 'Sugar'
          else if (cleanItemName.toLowerCase().includes('murgir moshla') || cleanItemName.toLowerCase().includes('mangsher moshla')) finalItemName = 'Chicken Masala'
          else {
            // Generic capitalization for other items - preserve the original name
            finalItemName = cleanItemName.charAt(0).toUpperCase() + cleanItemName.slice(1).toLowerCase()
          }
          
          console.log('Successfully parsed:', { finalItemName, quantity, unit, price })
          return {
            itemName: finalItemName,
            price,
            quantity: quantity || 1,
            unit: unit || null
          }
        }
      }
    }
    
    console.log('No pattern matched for line:', line)
    return null
  }

  function addAllParsedItems() {
    if (!form.parsedItems || form.parsedItems.length === 0) return

    const newPurchases = form.parsedItems.map(item => ({
      _id: (globalThis.crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
      itemName: item.itemName,
      quantity: item.quantity || 1,
      price: item.price,
      unit: item.unit || null, // Use parsed unit or null
      purchasedAt: form.purchasedAt || todayStr(),
      category: autoCategorizeItems(item.itemName), // Auto-categorize all AI parsed items
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    setPurchases(prev => [...newPurchases, ...prev])
    
    // Reset AI input and parsed items
    setForm(prev => ({ 
      ...prev,
      aiInput: '',
      parsedItems: []
    }))
    
    // Show success message
    alert(`Successfully added ${newPurchases.length} items to purchases!`)
  }

  function handleDelete(id) {
    setPurchases((list) => list.filter((p) => p._id !== id))
  }

  function handleEdit(purchase) {
    setEditingPurchase(purchase)
    setEditForm({
      itemName: purchase.itemName,
      category: purchase.category || '',
      purchasedAt: purchase.purchasedAt,
      quantity: purchase.quantity,
      unit: purchase.unit || '',
      price: purchase.price
    })
  }

  function handleSaveEdit() {
    if (!editingPurchase) return
    
    const updatedPurchase = {
      ...editingPurchase,
      itemName: editForm.itemName,
      category: editForm.category || null,
      purchasedAt: editForm.purchasedAt,
      quantity: Number(editForm.quantity),
      unit: editForm.unit || null,
      price: Number(editForm.price),
      updatedAt: new Date().toISOString()
    }
    
    setPurchases((list) => 
      list.map((p) => p._id === editingPurchase._id ? updatedPurchase : p)
    )
    
    setEditingPurchase(null)
    setEditForm({
      itemName: '',
      category: '',
      purchasedAt: '',
      quantity: 1,
      unit: '',
      price: ''
    })
  }

  function handleCancelEdit() {
    setEditingPurchase(null)
    setEditForm({
      itemName: '',
      category: '',
      purchasedAt: '',
      quantity: 1,
      unit: '',
      price: ''
    })
  }

  // Members
  function addMember(e) {
    e.preventDefault()
    const name = newMemberName.trim()
    if (!name) return
    const member = { id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()), name, active: true }
    setMembers((arr) => [...arr, member])
    setNewMemberName('')
  }

  function editMemberName(id, name) {
    setMembers((arr) => arr.map((m) => (m.id === id ? { ...m, name } : m)))
  }

  function deleteMember(id) {
    setMembers((arr) => arr.filter((m) => m.id !== id))
  }

  // Meals
  const [meals, setMeals] = useState(loadMealsFromStorage)


  useEffect(() => {
    saveMealsToStorage(meals)
  }, [meals])

  function submitMeals(e) {
    e.preventDefault()
    console.log('Submit meals called with:', { mealEntry, mealDate })
    
    if (!mealEntry.memberId || !mealEntry.itemId || !mealEntry.mealCount) {
      console.log('Validation failed:', { 
        memberId: mealEntry.memberId, 
        itemId: mealEntry.itemId, 
        mealCount: mealEntry.mealCount 
      })
      return
    }

    const newMeal = {
      id: (crypto.randomUUID && crypto.randomUUID()) || String(Date.now()),
      date: mealDate,
      memberId: mealEntry.memberId,
      itemId: mealEntry.itemId,
      mealCount: mealEntry.mealCount,
    }
    
    console.log('Adding meal:', newMeal)
    setMeals((arr) => {
      const newList = [...arr, newMeal]
      console.log('New meals list:', newList)
      return newList
    })
    
    // Reset form more efficiently
    setMealEntry(prev => ({
      ...prev,
      itemId: '',
      mealCount: 1,
    }))
  }

  // Calculations
  function inRange(date, start, end) {
    return date >= start && date <= end
  }

  const report = useMemo(() => {
    const start = reportStart
    const end = reportEnd
    
    // Filter purchases and meals by date range
    const periodPurchases = purchases.filter((p) => inRange((p.purchasedAt || '').slice(0, 10), start, end))
    const mealEntries = meals.filter((m) => inRange((m.date || '').slice(0, 10), start, end))
    
    // Calculate total expense
    const expense = periodPurchases.reduce((sum, p) => sum + Number(p.price), 0)
    
    // Calculate total meals
    const totalMeals = mealEntries.reduce((sum, m) => sum + (m.mealCount || 0), 0)
    const perMeal = totalMeals > 0 ? expense / totalMeals : 0
    
    // Calculate by member - based on individual items consumed
    const byMember = members.map((m) => {
      const memberMeals = mealEntries.filter((x) => x.memberId === m.id)
      const totalMeals = memberMeals.reduce((s, x) => s + (x.mealCount || 0), 0)
      
      // Calculate cost based on individual items consumed
      let totalCost = 0
      memberMeals.forEach(meal => {
        const purchase = periodPurchases.find(p => p._id === meal.itemId)
        if (purchase) {
          const itemTotalCost = Number(purchase.price)
          const itemTotalMeals = mealEntries.filter(m => m.itemId === meal.itemId)
            .reduce((sum, m) => sum + (m.mealCount || 0), 0)
          const perItemMealCost = itemTotalMeals > 0 ? itemTotalCost / itemTotalMeals : 0
          totalCost += perItemMealCost * meal.mealCount
        }
      })
      
      return { memberId: m.id, name: m.name, meals: totalMeals, cost: totalCost }
    })
    
    // Calculate by individual items
    const byItem = periodPurchases.map(purchase => {
      const itemMeals = mealEntries.filter(m => m.itemId === purchase._id)
      const totalItemMeals = itemMeals.reduce((sum, m) => sum + (m.mealCount || 0), 0)
      const itemTotalCost = Number(purchase.price)
      const perItemMeal = totalItemMeals > 0 ? itemTotalCost / totalItemMeals : 0
      
      return {
        itemId: purchase._id,
        itemName: purchase.itemName,
        totalCost: itemTotalCost,
        totalMeals: totalItemMeals,
        perMealCost: perItemMeal,
        quantity: purchase.quantity,
        unitPrice: purchase.price
      }
    }).filter(item => item.totalMeals > 0) // Only show items that have meals
    
    return { 
      expense, 
      totalMeals, 
      perMeal, 
      byMember, 
      byItem 
    }
  }, [purchases, meals, members, reportStart, reportEnd])

  function setThisWeek() {
    const d = new Date()
    const day = d.getDay() || 7
    const monday = new Date(d)
    monday.setDate(d.getDate() - day + 1)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    setReportStart(monday.toISOString().slice(0, 10))
    setReportEnd(sunday.toISOString().slice(0, 10))
  }

  function setThisMonth() {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    setReportStart(start.toISOString().slice(0, 10))
    setReportEnd(end.toISOString().slice(0, 10))
  }

  function exportCSV() {
    const rows = [
      ['Report From', reportStart, 'To', reportEnd],
      [],
      ['Totals'],
      ['Total Expense (BDT)', report.expense.toFixed(2)],
      ['Total Meals', report.totalMeals],
      ['Per Meal (BDT)', report.perMeal.toFixed(2)],
      [],
      ['Member Breakdown'],
      ['Member', 'Meals', 'Grand Total Price (BDT)'],
              ...report.byMember.map((r) => {
          // Calculate grand total price for this member (base cost + masala cost)
          const memberMeals = meals.filter(m => 
            m.memberId === r.memberId && 
            inRange((m.date || '').slice(0, 10), reportStart, reportEnd)
          )
          
          let totalMasalaCost = 0
          memberMeals.forEach(meal => {
            // Find the purchase item directly from purchases array
            const purchase = purchases.find(p => p._id === meal.itemId)
            if (purchase) {
              const itemName = purchase.itemName
              const itemNameLower = itemName.toLowerCase()
              let mealType = ''
              if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
                mealType = 'daal'
              } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                         itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                         itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
                mealType = 'chicken'
              } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                         itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
                mealType = 'fish'
              } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
                mealType = 'egg'
              } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
                mealType = 'potatoVorta'
              } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                         itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                         itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                         itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                         itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
                mealType = 'vegetables'
              }
              
              if (mealType) {
                const mealMasalaCost = calculateTotalMasalaCost(mealType) * meal.mealCount
                totalMasalaCost += mealMasalaCost
              }
            }
          })
          
          const grandTotalPrice = r.cost + totalMasalaCost
          return [r.name, r.meals, grandTotalPrice.toFixed(2)]
        }),
      [],
      ['Individual Item Breakdown'],
      ['Item', 'Grand Total Price (BDT)', 'Total Meals', 'Per Meal Cost (BDT)'],
      ...report.byItem.map((item) => [
        item.itemName,
        item.totalCost.toFixed(2),
        item.totalMeals,
        item.perMealCost.toFixed(2)
      ]),
    ]
      .map((r) => r.join(','))
      .join('\n')
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meal-report_${reportStart}_to_${reportEnd}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPurchasePDF() {
    const printWindow = window.open('', '_blank')
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase List Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 40px 20px;
            }
            
            .container {
              max-width: 1000px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              text-align: center;
            }
            
            .header h1 {
              font-size: 2.5rem;
              font-weight: 700;
              margin-bottom: 10px;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .header p {
              font-size: 1.1rem;
              opacity: 0.9;
              font-weight: 300;
            }
            
            .stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              padding: 30px;
              background: #f8fafc;
            }
            
            .stat-card {
              background: white;
              padding: 20px;
              border-radius: 15px;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              border: 1px solid #e2e8f0;
            }
            
            .stat-value {
              font-size: 2rem;
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 5px;
            }
            
            .stat-label {
              color: #64748b;
              font-size: 0.9rem;
              font-weight: 500;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .table-container {
              padding: 30px;
            }
            
            .table-title {
              font-size: 1.5rem;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 20px;
              text-align: center;
            }
            
            .purchase-table {
              width: 100%;
              border-collapse: collapse;
              background: white;
              border-radius: 15px;
              overflow: hidden;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .purchase-table th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 15px;
              text-align: left;
              font-weight: 600;
              font-size: 0.9rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            .purchase-table td {
              padding: 15px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 0.9rem;
            }
            
            .purchase-table tr:nth-child(even) {
              background: #f8fafc;
            }
            
            .purchase-table tr:hover {
              background: #f1f5f9;
            }
            
            .category-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: capitalize;
            }
            
            .category-rice { background: #dbeafe; color: #1e40af; }
            .category-daal { background: #fed7aa; color: #c2410c; }
            .category-meat { background: #fee2e2; color: #dc2626; }
            .category-fish { background: #ccfbf1; color: #0f766e; }
            .category-vegetables { background: #dcfce7; color: #166534; }
            .category-others { background: #f1f5f9; color: #475569; }
            
            .footer {
              background: #f8fafc;
              padding: 20px;
              text-align: center;
              color: #64748b;
              font-size: 0.9rem;
              border-top: 1px solid #e2e8f0;
            }
            
            @media print {
              body { background: white; padding: 0; }
              .container { box-shadow: none; border-radius: 0; }
              .header { background: #667eea !important; -webkit-print-color-adjust: exact; }
              .purchase-table th { background: #667eea !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 Purchase List Report</h1>
              <p>Complete inventory of all purchased items</p>
            </div>
            
            <div class="stats">
              <div class="stat-card">
                <div class="stat-value">${purchases.length}</div>
                <div class="stat-label">Total Items</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${totals.totalQuantity}</div>
                <div class="stat-label">Total Quantity</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${currency(totals.totalAmount)}</div>
                <div class="stat-label">Total Spent</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${new Date().toLocaleDateString()}</div>
                <div class="stat-label">Generated On</div>
              </div>
            </div>
            
            <div class="table-container">
              <h2 class="table-title">📋 Purchase Details</h2>
              <table class="purchase-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${purchases.map(purchase => `
                    <tr>
                      <td><strong>${purchase.itemName}</strong></td>
                      <td>
                        ${purchase.category ? 
                          `<span class="category-badge category-${purchase.category.toLowerCase()}">${purchase.category}</span>` : 
                          '<span style="color: #94a3b8;">—</span>'
                        }
                      </td>
                      <td>${formatDate(purchase.purchasedAt)}</td>
                      <td>${purchase.quantity}</td>
                      <td>
                        ${purchase.unit ? 
                          `<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${purchase.unit}</span>` : 
                          '<span style="color: #94a3b8;">—</span>'
                        }
                      </td>
                      <td><strong>${currency(purchase.price)}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>Generated by Meal Management System • ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  function exportMemberPDF(member, memberMeals, memberBreakdown, totalCost) {
    // Create a printable HTML report
    const printWindow = window.open('', '_blank')
    const totalMeals = memberMeals.reduce((sum, meal) => sum + (meal.mealCount || 0), 0)
    
    // Calculate total masala cost
    let totalMasalaCost = 0
    memberMeals.forEach(meal => {
      const itemName = shoppingList.find(i => i.id === meal.itemId)?.name || ''
      const itemNameLower = itemName.toLowerCase()
      let mealType = ''
      if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
        mealType = 'daal'
      } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                 itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                 itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
        mealType = 'chicken'
      } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                 itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
        mealType = 'fish'
      } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
        mealType = 'egg'
      } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
        mealType = 'potatoVorta'
      } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                 itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                 itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                 itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                 itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
        mealType = 'vegetables'
      }
      
      if (mealType) {
        const mealMasalaCost = calculateTotalMasalaCost(mealType) * meal.mealCount
        totalMasalaCost += mealMasalaCost
      }
    })
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${member.name}'s Meal Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 { 
              font-size: 24px; 
              margin-bottom: 10px; 
              color: #333;
            }
            .summary { 
              margin-bottom: 30px; 
              background: #f9f9f9;
              padding: 20px;
              border-radius: 5px;
            }
            .summary h2 { 
              margin-bottom: 15px; 
              color: #333;
            }
            .summary p { 
              margin-bottom: 10px; 
              font-size: 14px;
            }
            .breakdown { 
              margin-bottom: 30px; 
              background: #f9f9f9;
              padding: 20px;
              border-radius: 5px;
            }
            .breakdown h2 { 
              margin-bottom: 15px; 
              color: #333;
            }
            .breakdown-item {
              margin-bottom: 15px;
              padding: 10px;
              background: white;
              border-left: 4px solid #007bff;
            }
            .breakdown-item strong {
              color: #333;
            }
            .meals-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 30px; 
              border: 1px solid #ddd;
            }
            .meals-table th, .meals-table td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            .meals-table th { 
              background-color: #f2f2f2; 
              font-weight: bold;
            }
            .total { 
              font-weight: bold; 
              font-size: 18px; 
              text-align: right; 
              margin-top: 20px;
              padding: 15px;
              background: #e9ecef;
              border-radius: 5px;
            }
            .calculations {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 30px;
              border-left: 4px solid #28a745;
            }
            .calculations h3 {
              margin-bottom: 15px;
              color: #28a745;
            }
            .calculation-item {
              margin-bottom: 10px;
              padding: 8px;
              background: white;
              border-radius: 3px;
            }
            .masala-summary {
              background: #fff3cd;
              padding: 20px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: center;
              border-left: 4px solid #ffc107;
            }
            .masala-summary h3 {
              margin-bottom: 15px;
              color: #856404;
            }
            .masala-totals {
              display: flex;
              justify-content: space-around;
              gap: 20px;
            }
            .masala-total-item {
              text-align: center;
            }
            .masala-total-label {
              font-size: 14px;
              color: #856404;
              margin-bottom: 5px;
            }
            .masala-total-value {
              font-size: 18px;
              font-weight: bold;
              color: #856404;
            }
            @media print { 
              body { margin: 0; } 
              .header, .summary, .breakdown, .calculations, .masala-summary { 
                break-inside: avoid; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${member.name}'s Meal Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          

          
          <div class="calculations">
            <h3>Cost Calculations</h3>
            ${Object.entries(memberBreakdown).map(([itemName, details]) => `
              <div class="calculation-item">
                <strong>${itemName}:</strong><br>
                • Meals consumed: ${details.meals}<br>
                • Per meal cost: ${currency(details.perMealCost)}<br>
                ${details.perMealMasalaCost > 0 ? `• Per meal masala cost: ${currency(details.perMealMasalaCost)}<br>` : ''}
                • Total cost: ${details.meals} meals × ${currency(details.perMealCost)} = ${currency(details.totalCost)}<br>
                ${details.totalMasalaCost > 0 ? `• Total masala cost: ${details.meals} meals × ${currency(details.perMealMasalaCost)} = ${currency(details.totalMasalaCost)}<br>` : ''}
              </div>
            `).join('')}
            <div class="total">
              <strong>Total Cost: ${currency(totalCost)}</strong><br>
              ${totalMasalaCost > 0 ? `<strong>Total Masala Cost: ${currency(totalMasalaCost)}</strong><br>` : ''}
              <strong>Grand Total: ${currency(totalCost + totalMasalaCost)}</strong>
            </div>
          </div>
          
          <div class="breakdown">
            <h2>Cost Breakdown</h2>
            ${Object.entries(memberBreakdown).map(([itemName, details]) => 
              `<p><strong>${itemName}:</strong> ${details.meals} meals × ${currency(details.perMealCost)} = ${currency(details.totalCost)}${details.totalMasalaCost > 0 ? ` (Masala: ${currency(details.totalMasalaCost)})` : ''}</p>`
            ).join('')}
          </div>
          
          ${totalMasalaCost > 0 ? `
          <div class="masala-summary">
            <h3>Masala Cost Summary</h3>
            <div class="masala-totals">
              <div class="masala-total-item">
                <div class="masala-total-label">Total Masala Cost</div>
                <div class="masala-total-value">${currency(totalMasalaCost)}</div>
              </div>
              <div class="masala-total-item">
                <div class="masala-total-label">Average Masala Cost/Meal</div>
                <div class="masala-total-value">${currency(totalMasalaCost / Math.max(totalMeals, 1))}</div>
              </div>
            </div>
          </div>
          ` : ''}
          
          <div class="meals">
            <h2>Detailed Meal History</h2>
            <table class="meals-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Meal Count</th>
                </tr>
              </thead>
              <tbody>
                ${memberMeals.map(meal => {
                  const itemName = shoppingList.find(i => i.id === meal.itemId)?.name || ''
                  const itemNameLower = itemName.toLowerCase()
                  let mealType = ''
                  if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
                    mealType = 'daal'
                  } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                             itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                             itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
                    mealType = 'chicken'
                  } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                             itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
                    mealType = 'fish'
                  } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
                    mealType = 'egg'
                  } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
                    mealType = 'potatoVorta'
                  } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                             itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                             itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                             itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                             itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
                    mealType = 'vegetables'
                  }
                  
                  const mealMasalaCost = mealType ? calculateTotalMasalaCost(mealType) * meal.mealCount : 0
                  
                  return `
                  <tr>
                    <td>${formatDate(meal.date)}</td>
                      <td>${itemName}</td>
                    <td>${meal.mealCount}</td>
                  </tr>
                  `
                }).join('')}
              </tbody>
            </table>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  function exportSummaryPDF() {
    const printWindow = window.open('', '_blank')
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Complete Summary Report</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .header h1 { 
              font-size: 24px; 
              margin-bottom: 10px; 
              color: #333;
            }
            .date-range {
              background: #f9f9f9;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 30px;
              text-align: center;
            }
            .date-range strong {
              color: #333;
            }
            .members-list {
              margin-bottom: 30px;
            }
            .members-list h2 {
              margin-bottom: 20px;
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .member-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              border-bottom: 1px solid #eee;
              background: white;
            }
            .member-item:nth-child(even) {
              background: #f9f9f9;
            }
            .member-name {
              font-weight: bold;
              color: #333;
            }
            .member-cost {
              font-weight: bold;
              color: #007bff;
              font-size: 18px;
            }
            .total-section {
              background: #e9ecef;
              padding: 20px;
              border-radius: 5px;
              text-align: center;
              margin-top: 30px;
            }
            .total-amount {
              font-size: 24px;
              font-weight: bold;
              color: #28a745;
            }
            @media print { 
              body { margin: 0; } 
              .header, .date-range, .members-list, .total-section { 
                break-inside: avoid; 
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Complete Summary Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div class="date-range">
            <strong>Date Range:</strong> ${reportStart} to ${reportEnd}
          </div>
          
          <div class="members-list">
            <h2>Members Summary</h2>
            ${report.byMember
              .sort((a, b) => b.meals - a.meals)
              .map((member, idx) => {
                // Calculate grand total price for this member (base cost + masala cost)
                const memberMeals = meals.filter(m => 
                  m.memberId === member.memberId && 
                  inRange((m.date || '').slice(0, 10), reportStart, reportEnd)
                )
                
                let totalMasalaCost = 0
                memberMeals.forEach(meal => {
                  // Find the purchase item directly from purchases array
                  const purchase = purchases.find(p => p._id === meal.itemId)
                  if (purchase) {
                    const itemName = purchase.itemName
                    const itemNameLower = itemName.toLowerCase()
                    let mealType = ''
                    if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
                      mealType = 'daal'
                    } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                               itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                               itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
                      mealType = 'chicken'
                    } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                               itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
                      mealType = 'fish'
                    } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
                      mealType = 'egg'
                    } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
                      mealType = 'potatoVorta'
                    } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                               itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                               itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                               itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                               itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
                      mealType = 'vegetables'
                    }
                    
                    if (mealType) {
                      const mealMasalaCost = calculateTotalMasalaCost(mealType) * meal.mealCount
                      totalMasalaCost += mealMasalaCost
                    }
                  }
                })
                
                const grandTotalPrice = member.cost + totalMasalaCost
                
                return `
                <div class="member-item">
                  <span class="member-name">${member.name}</span>
                    <span class="member-cost">${currency(grandTotalPrice)}</span>
                </div>
                `
              }).join('')}
          </div>
          
          <div class="total-section">
            <strong>Total Expense:</strong>
            <div class="total-amount">${currency(report.expense)}</div>
          </div>
        </body>
      </html>
    `
    
    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  // Masala Cost Calculation Functions
  function calculateMasalaCost(mealType, ingredient) {
    let ingredientCost = 0
    switch (ingredient) {
      case 'onion':
        ingredientCost = form.masalaItems.onion.cost || 0
        break
      case 'potato':
        ingredientCost = form.masalaItems.potato.cost || 0
        break
      case 'turmeric':
        ingredientCost = form.masalaItems.turmeric.cost || 0
        break
      case 'chili':
        ingredientCost = form.masalaItems.chili.cost || 0
        break
      case 'ginger':
        ingredientCost = form.masalaItems.ginger.cost || 0
        break
      case 'garlic':
        ingredientCost = form.masalaItems.garlic.cost || 0
        break
      case 'chickenMasala':
        ingredientCost = form.masalaItems.chickenMasala.cost || 0
        break
      case 'oil':
        ingredientCost = form.masalaItems.oil.cost || 0
        break
      case 'tomato':
        ingredientCost = form.masalaItems.tomato.cost || 0
        break
      default:
        // Handle custom masala items
        ingredientCost = form.masalaItems[ingredient]?.cost || 0
        break
    }
    
    // Special rule for Onion, Turmeric, Garlic, Oil
    if (ingredient === 'onion' || ingredient === 'turmeric' || ingredient === 'garlic' || ingredient === 'oil') {
      // Step 1: Determine which curries use this ingredient
      let curriesUsing = []
      let totalMealsUsing = 0
      
      // Check which curries actually use this ingredient
      if (form.daalMeals > 0) {
        curriesUsing.push('daal')
        totalMealsUsing += form.daalMeals
      }
      if (form.chickenMeals > 0) {
        curriesUsing.push('chicken')
        totalMealsUsing += form.chickenMeals
      }
      if (form.fishMeals > 0) {
        curriesUsing.push('fish')
        totalMealsUsing += form.fishMeals
      }
      if (form.eggMeals > 0) {
        curriesUsing.push('egg')
        totalMealsUsing += form.eggMeals
      }
      if (form.vegetableMeals > 0) {
        curriesUsing.push('vegetables')
        totalMealsUsing += form.vegetableMeals
      }
      
      if (totalMealsUsing === 0) return 0
      
      // Step 2: Compute base per meal cost
      const basePerMeal = ingredientCost / totalMealsUsing
      
      // Step 3: Check if Daal is in curries_using
      if (curriesUsing.includes('daal')) {
        if (mealType === 'daal') {
          // Daal gets half of base per meal
          return basePerMeal / 2
        } else {
          // Non-Daal curries get remaining amount divided by remaining meals
          const daalMeals = form.daalMeals || 0
          const allocateDaal = (basePerMeal / 2) * daalMeals
          const remainingAmount = ingredientCost - allocateDaal
          const remainingMeals = totalMealsUsing - daalMeals
          
          if (remainingMeals > 0) {
            return remainingAmount / remainingMeals
          }
          return 0
        }
      } else {
        // Daal is NOT in curries_using - all curries get same base_per_meal
        return basePerMeal
      }
    }
    
    // Simple rule for all other masala items
    // Find which curries actually use this ingredient
    let curriesUsing = []
    let totalMealsUsing = 0
    
    switch (ingredient) {
      case 'potato':
        // Potato used in: Chicken, Fish, Vegetables, Potato Mash
        if (form.chickenMeals > 0) {
          curriesUsing.push('chicken')
          totalMealsUsing += form.chickenMeals
        }
        if (form.fishMeals > 0) {
          curriesUsing.push('fish')
          totalMealsUsing += form.fishMeals
        }
        if (form.vegetableMeals > 0) {
          curriesUsing.push('vegetables')
          totalMealsUsing += form.vegetableMeals
        }
        if (form.potatoVortaMeals > 0) {
          curriesUsing.push('potatoVorta')
          totalMealsUsing += form.potatoVortaMeals
        }
        break
      case 'chili':
        // Chili used in: Chicken, Fish, Egg, Vegetables
        if (form.chickenMeals > 0) {
          curriesUsing.push('chicken')
          totalMealsUsing += form.chickenMeals
        }
        if (form.fishMeals > 0) {
          curriesUsing.push('fish')
          totalMealsUsing += form.fishMeals
        }
        if (form.eggMeals > 0) {
          curriesUsing.push('egg')
          totalMealsUsing += form.eggMeals
        }
        if (form.vegetableMeals > 0) {
          curriesUsing.push('vegetables')
          totalMealsUsing += form.vegetableMeals
        }
        break
      case 'ginger':
        // Ginger used in: Chicken, Fish, Egg, Vegetables
        if (form.chickenMeals > 0) {
          curriesUsing.push('chicken')
          totalMealsUsing += form.chickenMeals
        }
        if (form.fishMeals > 0) {
          curriesUsing.push('fish')
          totalMealsUsing += form.fishMeals
        }
        if (form.eggMeals > 0) {
          curriesUsing.push('egg')
          totalMealsUsing += form.eggMeals
        }
        if (form.vegetableMeals > 0) {
          curriesUsing.push('vegetables')
          totalMealsUsing += form.vegetableMeals
        }
        break
      case 'tomato':
        // Tomato used in: Fish, Vegetables
        if (form.fishMeals > 0) {
          curriesUsing.push('fish')
          totalMealsUsing += form.fishMeals
        }
        if (form.vegetableMeals > 0) {
          curriesUsing.push('vegetables')
          totalMealsUsing += form.vegetableMeals
        }
        break
      case 'goromMasala':
        // Gorom Masala used in: Chicken, Fish, Egg, Vegetables
        if (form.chickenMeals > 0) {
          curriesUsing.push('chicken')
          totalMealsUsing += form.chickenMeals
        }
        if (form.fishMeals > 0) {
          curriesUsing.push('fish')
          totalMealsUsing += form.fishMeals
        }
        if (form.eggMeals > 0) {
          curriesUsing.push('egg')
          totalMealsUsing += form.eggMeals
        }
        if (form.vegetableMeals > 0) {
          curriesUsing.push('vegetables')
          totalMealsUsing += form.vegetableMeals
        }
        break
      case 'chickenMasala':
        // Chicken Masala used only in: Chicken
        if (form.chickenMeals > 0) {
          curriesUsing.push('chicken')
          totalMealsUsing += form.chickenMeals
        }
        break
      default:
        // For any other ingredient, use total meals
        totalMealsUsing = calculateTotalMeals()
        break
    }
    
    // Check if this meal type uses the ingredient
    if (curriesUsing.includes(mealType) && totalMealsUsing > 0) {
      return ingredientCost / totalMealsUsing
    }
    
    return 0
  }

  function calculateTotalMasalaCost(mealType) {
    let totalCost = 0
    
    switch (mealType) {
      case 'daal':
        const daalMeals = form.daalMeals || 0
        if (daalMeals > 0) {
          // Use individual calculation functions for each ingredient
          totalCost += calculateMasalaCost('daal', 'onion')
          totalCost += calculateMasalaCost('daal', 'turmeric')
          totalCost += calculateMasalaCost('daal', 'garlic')
          totalCost += calculateMasalaCost('daal', 'oil')
        }
        break
      case 'chicken':
        const chickenMeals = form.chickenMeals || 0
        if (chickenMeals > 0) {
          // Use individual calculation functions for each ingredient
          totalCost += calculateMasalaCost('chicken', 'onion')
          totalCost += calculateMasalaCost('chicken', 'potato')
          totalCost += calculateMasalaCost('chicken', 'turmeric')
          totalCost += calculateMasalaCost('chicken', 'chili')
          totalCost += calculateMasalaCost('chicken', 'ginger')
          totalCost += calculateMasalaCost('chicken', 'garlic')
          totalCost += calculateMasalaCost('chicken', 'oil')
          totalCost += calculateMasalaCost('chicken', 'chickenMasala')
          totalCost += calculateMasalaCost('chicken', 'goromMasala')
        }
        break
      case 'fish':
        const fishMeals = form.fishMeals || 0
        if (fishMeals > 0) {
          // Use individual calculation functions for each ingredient
          totalCost += calculateMasalaCost('fish', 'onion')
          totalCost += calculateMasalaCost('fish', 'potato')
          totalCost += calculateMasalaCost('fish', 'turmeric')
          totalCost += calculateMasalaCost('fish', 'chili')
          totalCost += calculateMasalaCost('fish', 'ginger')
          totalCost += calculateMasalaCost('fish', 'garlic')
          totalCost += calculateMasalaCost('fish', 'oil')
          totalCost += calculateMasalaCost('fish', 'tomato')
          totalCost += calculateMasalaCost('fish', 'goromMasala')
        }
        break
      case 'egg':
        const eggMeals = form.eggMeals || 0
        if (eggMeals > 0) {
          // Use individual calculation functions for each ingredient
          totalCost += calculateMasalaCost('egg', 'onion')
          totalCost += calculateMasalaCost('egg', 'turmeric')
          totalCost += calculateMasalaCost('egg', 'chili')
          totalCost += calculateMasalaCost('egg', 'ginger')
          totalCost += calculateMasalaCost('egg', 'garlic')
          totalCost += calculateMasalaCost('egg', 'oil')
          totalCost += calculateMasalaCost('egg', 'goromMasala')
        }
        break
      case 'vegetables':
        const vegetableMeals = form.vegetableMeals || 0
        if (vegetableMeals > 0) {
          // Use individual calculation functions for each ingredient
          totalCost += calculateMasalaCost('vegetables', 'onion')
          totalCost += calculateMasalaCost('vegetables', 'potato')
          totalCost += calculateMasalaCost('vegetables', 'turmeric')
          totalCost += calculateMasalaCost('vegetables', 'chili')
          totalCost += calculateMasalaCost('vegetables', 'ginger')
          totalCost += calculateMasalaCost('vegetables', 'garlic')
          totalCost += calculateMasalaCost('vegetables', 'oil')
          totalCost += calculateMasalaCost('vegetables', 'goromMasala')
        }
        break
      case 'potatoVorta':
        const potatoVortaMeals = form.potatoVortaMeals || 0
        if (potatoVortaMeals > 0) {
          // Use individual calculation functions for each ingredient
          totalCost += calculateMasalaCost('potatoVorta', 'onion')
          totalCost += calculateMasalaCost('potatoVorta', 'potato')
        }
        break
      default:
        return 0
    }
    
    return totalCost
  }

  function calculateGrandTotalMasalaCost() {
    return (form.masalaItems.onion.cost || 0) + (form.masalaItems.potato.cost || 0) + (form.masalaItems.turmeric.cost || 0) + 
           (form.masalaItems.chili.cost || 0) + (form.masalaItems.ginger.cost || 0) + (form.masalaItems.garlic.cost || 0) + 
           (form.masalaItems.chickenMasala.cost || 0) + (form.masalaItems.oil.cost || 0) + (form.masalaItems.tomato.cost || 0) + 
           (form.masalaItems.goromMasala.cost || 0)
  }

  function calculateTotalMeals() {
    const daalMeals = (form.daalMeals || 0) / 2  // Count daal meals as half
    const otherMeals = (form.chickenMeals || 0) + (form.fishMeals || 0) + 
                       (form.eggMeals || 0) + (form.vegetableMeals || 0) + (form.potatoVortaMeals || 0)
    return daalMeals + otherMeals
  }



  const dailyMealEntries = useMemo(() => {
    return meals.filter((m) => m.date === mealDate)
  }, [meals, mealDate])

  // Auto-categorize uncategorized items
  function autoCategorizeItems(itemName) {
    const name = itemName.toLowerCase()
    
    // Auto-categorize based on item name
    if (name.includes('rice') || name.includes('chal') || name.includes('vat') || 
        name.includes('ata') || name.includes('flour') || name.includes('bread')) {
      return 'Rice'
    } else if (name.includes('daal') || name.includes('dal') || name.includes('lentil') || 
               name.includes('bean') || name.includes('chickpea')) {
      return 'Daal'
    } else if (name.includes('chicken') && !name.includes('masala') || name.includes('murgi') && !name.includes('moshla') || 
               name.includes('meat') || name.includes('beef') || name.includes('mutton') || name.includes('lamb')) {
      return 'Meat'
    } else if (name.includes('fish') || name.includes('mach') || name.includes('shrimp') || 
               name.includes('prawn') || name.includes('crab')) {
      return 'Fish'
    } else if (name.includes('potato') || name.includes('alu') || name.includes('onion') || 
               name.includes('peyaj') || name.includes('tomato') || name.includes('carrot') ||
               name.includes('cucumber') || name.includes('cabbage') || name.includes('cauliflower') ||
               name.includes('spinach') || name.includes('lettuce') || name.includes('pepper')) {
      return 'Vegetables'
    } else if (name.includes('holud') || name.includes('morich') || name.includes('ada') || 
               name.includes('roshun') || name.includes('murgir moshla') || name.includes('mangsher moshla') ||
               name.includes('gura moshla') || name.includes('gorom moshla') || name.includes('garam masala') ||
               name.includes('turmeric') || name.includes('chili') || name.includes('ginger') || 
               name.includes('garlic') || name.includes('spice') || name.includes('masala') || 
               name.includes('chicken masala')) {
      return 'Masala'
    } else {
      // Any unknown item automatically goes to "Others"
      return 'Others'
    }
  }

  // Load prices from purchases into masala cost calculation
  function loadPricesFromPurchases() {
    const updatedMasalaItems = { ...form.masalaItems }
    let loadedCount = 0
    
    // Go through each masala item and find matching purchases
    Object.keys(updatedMasalaItems).forEach(key => {
      const masalaName = key
      let searchTerms = []
      
      // Define search terms for each masala item
      switch (masalaName) {
        case 'onion':
          searchTerms = ['onion', 'peyaj', 'piaz']
          break
        case 'potato':
          searchTerms = ['potato', 'alu', 'aloo']
          break
        case 'turmeric':
          searchTerms = ['turmeric', 'holud', 'haldi']
          break
        case 'chili':
          searchTerms = ['chili', 'morich', 'mirch']
          break
        case 'ginger':
          searchTerms = ['ginger', 'ada', 'adrak']
          break
        case 'garlic':
          searchTerms = ['garlic', 'roshun', 'lehsun']
          break
        case 'chickenMasala':
          searchTerms = ['chicken masala', 'murgir moshla', 'mangsher moshla', 'chicken masala']
          break
        case 'oil':
          searchTerms = ['oil', 'tel', 'oil']
          break
        case 'tomato':
          searchTerms = ['tomato', 'tomato']
          break
        case 'goromMasala':
          searchTerms = ['gorom moshla', 'garam masala', 'hot masala', 'gorom moshla']
          break
        default:
          searchTerms = [masalaName]
      }
      
      // Find the most recent purchase that matches
      const matchingPurchase = purchases.find(p => {
        return searchTerms.some(term => 
          p.itemName.toLowerCase().includes(term.toLowerCase())
        )
      })
      
      if (matchingPurchase) {
        updatedMasalaItems[key].cost = Number(matchingPurchase.price)
        loadedCount++
      }
    })
    
    setForm(prev => ({ ...prev, masalaItems: updatedMasalaItems }))
    
    if (loadedCount > 0) {
      alert(`Successfully loaded prices for ${loadedCount} masala items from your purchase list!`)
    } else {
      alert('No matching masala items found in your purchase list. Make sure you have purchased these items first.')
    }
  }

  // Load meal counts by individual items from meals data
  function loadMealCountsByItems() {
    // Get the current date range for the report
    const start = reportStart
    const end = reportEnd
    
    // Filter meals by date range
    const periodMeals = meals.filter((m) => {
      const mealDate = (m.date || '').slice(0, 10)
      return mealDate >= start && mealDate <= end
    })
    
    // Group meals by item and calculate totals
    const itemMealCounts = {}
    
    periodMeals.forEach(meal => {
      const itemName = shoppingList.find(i => i.id === meal.itemId)?.name || 'Unknown Item'
      if (!itemMealCounts[itemName]) {
        itemMealCounts[itemName] = 0
      }
      itemMealCounts[itemName] += meal.mealCount || 0
    })
    
    // Map item names to meal count fields
    const updatedMealCounts = { ...form }
    let loadedCount = 0
    
    // Check each item and map to appropriate meal count field
    Object.entries(itemMealCounts).forEach(([itemName, mealCount]) => {
      const itemNameLower = itemName.toLowerCase()
      
      if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
        updatedMealCounts.daalMeals = mealCount
        loadedCount++
      } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                 itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                 itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
        updatedMealCounts.chickenMeals = mealCount
        loadedCount++
      } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                 itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
        updatedMealCounts.fishMeals = mealCount
        loadedCount++
      } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
        updatedMealCounts.eggMeals = mealCount
        loadedCount++
      } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
        updatedMealCounts.potatoVortaMeals = mealCount
        loadedCount++
      } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                 itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                 itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                 itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                 itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
        // Add to vegetables if not already counted
        updatedMealCounts.vegetableMeals = (updatedMealCounts.vegetableMeals || 0) + mealCount
        loadedCount++
      }
    })
    
    setForm(updatedMealCounts)
    
    if (loadedCount > 0) {
      alert(`Successfully loaded meal counts for ${loadedCount} item categories from your meal data!`)
    } else {
      alert('No meal data found for the selected date range. Make sure you have recorded meals first.')
    }
  }

  // Clear all inputs in the three sections
  function clearAllInputs() {
    // Clear meal counts
    setForm(prev => ({
      ...prev,
      daalMeals: '',
      chickenMeals: '',
      fishMeals: '',
      eggMeals: '',
      vegetableMeals: '',
      potatoVortaMeals: '',
      // Clear masala items costs
      masalaItems: {
        onion: { cost: '' },
        potato: { cost: '' },
        turmeric: { cost: '' },
        chili: { cost: '' },
        ginger: { cost: '' },
        garlic: { cost: '' },
        chickenMasala: { cost: '' },
        oil: { cost: '' },
        tomato: { cost: '' },
        goromMasala: { cost: '' }
      }
    }))
    
    // Clear daily meal entry
    setMealEntry({
      memberId: '',
      itemId: '',
      mealCount: 1,
    })
    
    // Reset meal date to today
    setMealDate(todayStr())
    
    alert('All inputs have been cleared successfully!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900">
      <nav className="sticky top-0 z-10 backdrop-blur-md supports-[backdrop-filter]:bg-white/80 bg-white/90 border-b border-slate-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            🍽️ Meal Management
          </span>
          <span className="text-sm/none text-slate-600 bg-slate-100 px-3 py-1 rounded-full">Track your purchases</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Mobile-friendly summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-4 sm:p-6 shadow-xl transform hover:scale-105 transition-all duration-300">
            <p className="text-xs sm:text-sm text-green-100 mb-2">Total Spent</p>
            <p className="text-xl sm:text-3xl font-bold">{currency(totals.totalAmount)}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Add Purchase Form - Left Side */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h2 className="text-lg font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Add Purchase</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-gray-700 font-medium">Item name</span>
                  <input
                    className="input text-base bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                    placeholder="e.g., Rice"
                    value={form.itemName}
                    onChange={(e) => setForm(prev => ({ ...prev, itemName: e.target.value }))}
                    required
                  />
                </label>
              <div className="grid grid-cols-3 gap-4">
                  <label className="grid gap-2 text-sm">
                    <span className="text-gray-700 font-medium">Quantity</span>
                    <input
                      type="number"
                      min="1"
                      className="input text-base bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 max-w-[120px]"
                      value={form.quantity}
                      onChange={(e) => setForm(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                  <span className="text-gray-700 font-medium">Unit (Optional)</span>
                  <select
                    className="input text-base bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 max-w-[120px]"
                    value={form.unit || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, unit: e.target.value }))}
                  >
                    <option value="">No unit</option>
                    <option value="KG">KG</option>
                    <option value="Gram">Gram</option>
                    <option value="Liter">Liter</option>
                    <option value="Piece">Piece</option>
                    <option value="Pack">Pack</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-gray-700 font-medium">Total Price</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input text-base bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 max-w-[120px]"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value === '' ? '' : Number(e.target.value) }))}
                      required
                    />
                  </label>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="grid gap-2 text-sm">
                  <span className="text-gray-700 font-medium">Category</span>
                  <select
                    className="input text-base bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                    value={form.category || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="Rice">Rice</option>
                    <option value="Daal">Daal</option>
                    <option value="Meat">Meat</option>
                    <option value="Fish">Fish</option>
                    <option value="Vegetables">Vegetables</option>
                    <option value="Masala">Masala</option>
                    <option value="Others">Others</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="text-gray-700 font-medium">Date</span>
                  <input
                    type="date"
                    className="input text-base bg-white/70 border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                    value={form.purchasedAt}
                    onChange={(e) => setForm(prev => ({ ...prev, purchasedAt: e.target.value }))}
                    required
                  />
                </label>
              </div>
                <button
                  type="submit"
                  className="btn-primary bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Add Purchase
                </button>
              </form>
            </div>

          {/* AI Smart Input Parser - Right Side */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-xl border border-purple-200/50">
            <h2 className="text-lg font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              🧠 AI Smart Input
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              You can paste your messy notes here from your notepad and AI will input it automatically!
            </p>
            <p className="text-xs text-purple-600 mb-4 bg-purple-100 px-3 py-2 rounded-lg">
              📅 Purchases will be added with date: <strong>{formatDate(form.purchasedAt)}</strong>
            </p>
            
            <div className="space-y-4">
              <textarea
                className="w-full h-35 p-3 border border-purple-200 rounded-lg resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
                placeholder="Example:&#10;Rice =95 Tk &#10;Chicken 190 Tk&#10;Alu 1 KG = 30 Tk&#10;Peyaj 0.5 KG - 30 Tk&#10;&#10;Or comma separated:&#10;vat 3kg 300 tk, murgi 1 kg 195 tk, alu 2 kg 50 bdt"
                value={form.aiInput || ''}
                onChange={(e) => setForm(prev => ({ ...prev, aiInput: e.target.value }))}
              />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={parseAIInput}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                  disabled={!form.aiInput?.trim() || form.isParsing}
                >
                  {form.isParsing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Parsing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Parse & Add Items
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, aiInput: '' }))}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  title="Clear input"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
          </div>

              {/* Parsed Items Preview */}
              {form.parsedItems && form.parsedItems.length > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-3">📋 Parsed Items ({form.parsedItems.length})</h4>
                  <div className="space-y-2">
                    {form.parsedItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-green-200">
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">{item.itemName}</span>
                          {item.quantity && item.quantity > 1 && (
                            <span className="ml-2 text-sm text-gray-600">× {item.quantity}</span>
                          )}
                          {item.unit && (
                            <span className="ml-2 text-sm text-gray-500">({item.unit})</span>
                          )}
                        </div>
                        <span className="font-semibold text-green-700">৳{item.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={addAllParsedItems}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✅ Add All to Purchases
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, parsedItems: [] }))}
                      className="px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      🗑️ Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Purchases Section - Full Width Below */}
        <section className="mt-6">
            <div className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <h2 className="text-base font-semibold">Check Your Purchases</h2>
                <div className="sm:ml-auto flex gap-2">
                  <input
                    className="input w-full sm:w-64"
                    placeholder="Search by item name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    onClick={exportPurchasePDF}
                    className="btn-primary whitespace-nowrap"
                    title="Download Purchase List as PDF"
                  >
                  Download List
                  </button>
                {filtered.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete all purchases? This action cannot be undone.')) {
                        setPurchases([])
                      }
                    }}
                    className="btn-primary whitespace-nowrap bg-red-600 hover:bg-red-700 text-white"
                    title="Delete All Purchases"
                  >
                    Clear List
                  </button>
                )}
                </div>
              </div>

              {filtered.length === 0 ? (
                <p className="text-sm text-gray-600">No purchases to show.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="table-th">Item</th>
                        <th className="table-th">Category</th>
                        <th className="table-th">Date</th>
                        <th className="table-th">Qty</th>
                        <th className="table-th">Unit</th>
                      <th className="table-th">Total Price</th>
                        <th className="table-th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, idx) => (
                        <tr key={p._id} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="table-td font-medium text-gray-900">{p.itemName}</td>
                          <td className="table-td text-gray-600">
                            {p.category ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                p.category === 'rice' ? 'bg-blue-100 text-blue-800' :
                                p.category === 'daal' ? 'bg-orange-100 text-orange-800' :
                                p.category === 'meat' ? 'bg-red-100 text-red-800' :
                                p.category === 'fish' ? 'bg-teal-100 text-teal-800' :
                                p.category === 'vegetables' ? 'bg-green-100 text-green-800' :
                              p.category === 'masala' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {p.category.charAt(0).toUpperCase() + p.category.slice(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="table-td text-gray-600">{formatDate(p.purchasedAt)}</td>
                          <td className="table-td">{p.quantity}</td>
                        <td className="table-td text-gray-600">
                          {p.unit ? (
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              {p.unit}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="table-td font-semibold">{currency(p.price)}</td>
                          <td className="table-td">
                          <div className="flex gap-2">
                            <button
                              className="text-blue-600 hover:text-blue-700 hover:underline transition-all duration-200 transform hover:scale-105 active:scale-95"
                              onClick={() => handleEdit(p)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-600 hover:text-red-700 hover:underline transition-all duration-200 transform hover:scale-105 active:scale-95"
                              onClick={() => handleDelete(p._id)}
                            >
                              Delete
                            </button>
                          </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-semibold text-gray-800">
                        <td className="table-td">Totals</td>
                        <td className="table-td"></td>
                        <td className="table-td"></td>
                      <td className="table-td"></td>
                      <td className="table-td"></td>
                        <td className="table-td">{currency(tableTotals.totalAmount)}</td>
                        <td className="table-td"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

          {/* Edit Purchase Modal */}
          {editingPurchase && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">Edit Purchase</h3>
                    <button
                      onClick={handleCancelEdit}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
          </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
                      <input
                        type="text"
                        value={editForm.itemName}
                        onChange={(e) => setEditForm(prev => ({ ...prev, itemName: e.target.value }))}
                        className="input w-full"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={editForm.category}
                        onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                        className="input w-full"
                      >
                        <option value="">Select Category</option>
                        <option value="rice">Rice</option>
                        <option value="daal">Daal</option>
                        <option value="meat">Meat</option>
                        <option value="fish">Fish</option>
                        <option value="vegetables">Vegetables</option>
                        <option value="masala">Masala</option>
                        <option value="others">Others</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Date</label>
                      <input
                        type="date"
                        value={editForm.purchasedAt}
                        onChange={(e) => setEditForm(prev => ({ ...prev, purchasedAt: e.target.value }))}
                        className="input w-full"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                          className="input w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                        <select
                          value={editForm.unit}
                          onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))}
                          className="input w-full"
                        >
                          <option value="">No Unit</option>
                          <option value="KG">KG</option>
                          <option value="Gram">Gram</option>
                          <option value="Liter">Liter</option>
                          <option value="Piece">Piece</option>
                          <option value="Pack">Pack</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Total Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                        className="input w-full"
                        required
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Member Management */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-1">
            <div className="card p-5">
              <h2 className="text-base font-semibold mb-4">Add Members</h2>
              <form onSubmit={addMember} className="flex gap-2 mb-4">
                <input 
                  className="input flex-1 min-w-0" 
                  placeholder="Member name" 
                  value={newMemberName} 
                  onChange={(e) => setNewMemberName(e.target.value)} 
                />
                <button className="btn-primary whitespace-nowrap px-4">Add</button>
              </form>
              <ul className="divide-y divide-gray-200">
                {members.map((m) => (
                  <li key={m.id} className="py-3 flex items-center gap-3">
                    <input
                      className="input flex-1 min-w-0"
                      value={m.name}
                      onChange={(e) => editMemberName(m.id, e.target.value)}
                      placeholder="Member name"
                    />
                    <button 
                      className="text-red-600 hover:text-red-700 hover:underline text-sm whitespace-nowrap px-2 py-1 rounded hover:bg-red-50 transition-all duration-200 transform hover:scale-105 active:scale-95" 
                      onClick={() => deleteMember(m.id)}
                    >
                      Delete
                    </button>
                  </li>
                ))}
                {members.length === 0 && <li className="py-4 text-sm text-gray-500 text-center">No members yet.</li>}
              </ul>
            </div>
          </div>

          {/* Daily meal entry */}
          <div className="lg:col-span-2">
            <div className="card p-5">
              <h2 className="text-base font-semibold mb-4">Entry Members Daily Meals</h2>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Add daily meal entries for members</p>
                <button
                  type="button"
                  onClick={() => {
                    setMealEntry({
                      memberId: '',
                      itemId: '',
                      mealCount: 1,
                    })
                    setMealDate(todayStr())
                    alert('Daily meal entry form cleared successfully!')
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  title="Clear meal entry form and reset date"
                >
                  🗑️ Clear All History
                </button>
              </div>
              <form onSubmit={submitMeals} className="space-y-3">
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-sm text-gray-700">Date</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const currentDate = new Date(mealDate);
                        const previousDay = new Date(currentDate);
                        previousDay.setDate(currentDate.getDate() - 1);
                        setMealDate(previousDay.toISOString().split('T')[0]);
                      }}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      title="Previous Day"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <input className="input" type="date" value={mealDate} onChange={(e) => setMealDate(e.target.value)} />
                    <button
                      type="button"
                      onClick={() => {
                        const currentDate = new Date(mealDate);
                        const nextDay = new Date(currentDate);
                        nextDay.setDate(currentDate.getDate() + 1);
                        setMealDate(nextDay.toISOString().split('T')[0]);
                      }}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      title="Next Day"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <select
                    className="input text-base"
                    value={mealEntry.memberId}
                    onChange={(e) => setMealEntry((prev) => ({ ...prev, memberId: e.target.value }))}
                    disabled={members.length === 0}
                  >
                    {members.length === 0 ? (
                      <option value="">No members yet</option>
                    ) : (
                      <>
                        <option value="">Select member</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <select
                    className="input text-base"
                    value={mealEntry.itemId}
                    onChange={(e) => setMealEntry((prev) => ({ ...prev, itemId: e.target.value }))}
                    disabled={shoppingList.length === 0}
                  >
                    {shoppingList.length === 0 ? (
                      <option value="">No purchases yet</option>
                    ) : (
                      <>
                        <option value="">Select item</option>
                        {shoppingList.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <input
                    className="input text-base"
                    type="number"
                    min="1"
                    value={mealEntry.mealCount}
                    onChange={(e) => setMealEntry((prev) => ({ ...prev, mealCount: Number(e.target.value) }))}
                    placeholder="Meal count"
                  />
                  <button className="btn-primary text-base py-3">Add meal</button>
                </div>
              </form>

              <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                                        <tr>
                      <th className="table-th">Member</th>
                      <th className="table-th">Item</th>
                      <th className="table-th">Meal Count</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyMealEntries.map((meal, idx) => (
                      <tr key={`${meal.date}-${meal.memberId}-${meal.itemId}-${idx}`} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="table-td">
                          {members.find((m) => m.id === meal.memberId)?.name || 'N/A'}
                        </td>
                        <td className="table-td">
                          {shoppingList.find((i) => i.id === meal.itemId)?.name || 'N/A'}
                        </td>
                        <td className="table-td">{meal.mealCount}</td>
                        <td className="table-td">
                          <button
                            className="text-red-600 hover:text-red-700 hover:underline transition-all duration-200 transform hover:scale-105 active:scale-95"
                            onClick={() => setMeals((arr) => arr.filter((m) => m.id !== meal.id))}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>



        {/* Reports */}
        <section className="card p-5 mt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">📊 Reports & Analytics</h2>
          <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
            <div>
              <label className="text-sm text-gray-700">From</label>
              <input className="input ml-2" type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-700">To</label>
              <input className="input ml-2" type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
            </div>
            <div className="md:ml-auto flex gap-2">
              <button className="input px-3 py-2" onClick={setThisWeek} type="button">This week</button>
              <button className="input px-3 py-2" onClick={setThisMonth} type="button">This month</button>
              <button className="btn-primary" onClick={exportCSV} type="button">Export CSV</button>
            </div>
          </div>

          {/* Summary cards hidden as requested */}

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead>
                                    <tr>
                      <th className="table-th">Member</th>
                      <th className="table-th">Meals</th>
                      <th className="table-th">Total Cost (Without Masala)</th>
                    </tr>
              </thead>
              <tbody>
                {report.byMember.map((r, idx) => (
                                      <tr key={r.memberId} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="table-td">{r.name}</td>
                      <td className="table-td">{r.meals}</td>
                      <td className="table-td">{currency(r.cost)}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>

          

          {/* Item Summary Table */}
          {report.byItem.length > 0 && (
            <div className="mt-6">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="table-th">Item</th>
                      <th className="table-th">Grand Total Price</th>
                      <th className="table-th">Total Meals</th>
                      <th className="table-th">Per Meal Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byItem.map((item, idx) => (
                      <tr key={item.itemId} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="table-td font-medium text-gray-900">{item.itemName}</td>
                        <td className="table-td font-semibold">{currency(item.totalCost)}</td>
                        <td className="table-td">{item.totalMeals}</td>
                        <td className="table-td font-semibold text-blue-600">
                          {currency(item.perMealCost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Meal Consumption Pattern */}
        <section className="card p-5 mt-6">
          <h2 className="text-base font-semibold mb-4">Meal Consumption Pattern</h2>
          
          {members.length === 0 ? (
            <p className="text-sm text-gray-600">No members yet. Add members first to see consumption patterns.</p>
          ) : (
            <div className="space-y-4">
              {/* Top Consumers */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Top Consumers (Most Meals)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {report.byMember
                    .sort((a, b) => b.meals - a.meals)
                    .slice(0, 3)
                    .map((member, idx) => (
                      <div key={member.memberId} className={`p-3 rounded-lg border ${
                        idx === 0 ? 'bg-yellow-50 border-yellow-200' : 
                        idx === 1 ? 'bg-gray-50 border-gray-200' : 
                        'bg-orange-50 border-orange-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900">{member.name}</span>
                          <span className={`text-sm font-bold ${
                            idx === 0 ? 'text-yellow-700' : 
                            idx === 1 ? 'text-gray-700' : 
                            'text-orange-700'
                          }`}>
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {member.meals} meals • {currency(member.cost)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Consumption Distribution */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Consumption Distribution</h3>
                <div className="space-y-2">
                  {report.byMember
                    .sort((a, b) => b.meals - a.meals)
                    .map((member) => {
                      const percentage = report.totalMeals > 0 ? (member.meals / report.totalMeals * 100).toFixed(1) : 0
                      return (
                        <div key={member.memberId} className="flex items-center gap-3">
                          <div className="w-24 text-sm font-medium text-gray-700">{member.name}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="w-16 text-right text-sm text-gray-600">
                            {member.meals} ({percentage}%)
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Individual Member Meal History */}
        <section className="bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mt-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Individual Member Meal History
            </h2>
            <p className="text-gray-600 mt-2">Track each member's consumption and costs in detail</p>
          </div>
          
          {members.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No members yet</p>
              <p className="text-gray-400">Add members first to see their meal history</p>
            </div>
          ) : (
            <div className="space-y-8">
              {members.map((member, memberIndex) => {
                const memberMeals = meals
                  .filter(meal => meal.memberId === member.id)
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                
                const totalMeals = memberMeals.reduce((sum, meal) => sum + (meal.mealCount || 0), 0)
                
                // Calculate detailed breakdown for this member
                const memberBreakdown = {}
                let totalCost = 0
                let totalMasalaCost = 0
                
                memberMeals.forEach(meal => {
                  const purchase = purchases.find(p => p._id === meal.itemId)
                  if (purchase) {
                    const itemName = purchase.itemName
                    if (!memberBreakdown[itemName]) {
                      memberBreakdown[itemName] = {
                        meals: 0,
                        totalCost: 0,
                        perMealCost: 0,
                        perMealMasalaCost: 0,
                        totalMasalaCost: 0
                      }
                    }
                    
                    const itemTotalCost = Number(purchase.price)
                    const allItemMeals = meals.filter(m => m.itemId === meal.itemId)
                      .reduce((sum, m) => sum + (m.mealCount || 0), 0)
                    const perItemMealCost = allItemMeals > 0 ? itemTotalCost / allItemMeals : 0
                    
                    // Calculate masala cost for this item
                    const itemNameLower = itemName.toLowerCase()
                    let mealType = ''
                    if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
                      mealType = 'daal'
                    } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                               itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                               itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
                      mealType = 'chicken'
                    } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                               itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
                      mealType = 'fish'
                    } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
                      mealType = 'egg'
                    } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
                      mealType = 'potatoVorta'
                    } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                               itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                               itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                               itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                               itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
                      mealType = 'vegetables'
                    }
                    
                    let itemMasalaCost = 0
                    if (mealType) {
                      itemMasalaCost = calculateTotalMasalaCost(mealType)
                    }
                    
                    memberBreakdown[itemName].meals += meal.mealCount
                    memberBreakdown[itemName].perMealCost = perItemMealCost
                    memberBreakdown[itemName].totalCost = memberBreakdown[itemName].meals * perItemMealCost
                    memberBreakdown[itemName].perMealMasalaCost = itemMasalaCost
                    memberBreakdown[itemName].totalMasalaCost = memberBreakdown[itemName].meals * itemMasalaCost
                    
                    totalCost += perItemMealCost * meal.mealCount
                    totalMasalaCost += itemMasalaCost * meal.mealCount
                  }
                })
                
                // Define different color schemes for each member
                const colorSchemes = [
                  { from: 'from-indigo-500', via: 'via-purple-500', to: 'to-pink-500', accent: 'text-indigo-600' },
                  { from: 'from-blue-500', via: 'via-cyan-500', to: 'to-teal-500', accent: 'text-blue-600' },
                  { from: 'from-emerald-500', via: 'via-green-500', to: 'to-lime-500', accent: 'text-emerald-600' },
                  { from: 'from-orange-500', via: 'via-red-500', to: 'to-pink-500', accent: 'text-orange-600' },
                  { from: 'from-violet-500', via: 'via-purple-500', to: 'to-indigo-500', accent: 'text-violet-600' },
                  { from: 'from-rose-500', via: 'via-pink-500', to: 'to-red-500', accent: 'text-rose-600' },
                  { from: 'from-amber-500', via: 'via-yellow-500', to: 'to-orange-500', accent: 'text-amber-600' },
                  { from: 'from-sky-500', via: 'via-blue-500', to: 'to-indigo-500', accent: 'text-sky-600' }
                ]
                
                const memberColors = colorSchemes[memberIndex % colorSchemes.length]
                
                return (
                  <div key={member.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300">
                    {/* Premium Header */}
                    <div className={`bg-gradient-to-r ${memberColors.from} ${memberColors.via} ${memberColors.to} p-6 text-white`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                            <span className="text-xl font-bold text-white">
                              {member.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
      <div>
                            <h3 className="text-2xl font-bold text-white">{member.name}</h3>
                            <p className="text-indigo-100 text-sm">Member Profile</p>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-4 text-white/90">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{totalMeals}</div>
                              <div className="text-xs text-indigo-100">Total Meals</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{currency(totalCost + totalMasalaCost)}</div>
                              <div className="text-xs text-indigo-100">Grand Total</div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button 
                              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg border border-white/30 transition-all duration-200 backdrop-blur-sm font-medium"
                              onClick={() => exportMemberPDF(member, memberMeals, memberBreakdown, totalCost)}
                            >
                              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Export PDF
                            </button>
                            <button 
                              className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                                expandedCostBreakdown.has(member.id) 
                                  ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' 
                                  : `bg-white ${memberColors.accent} border-white hover:bg-gray-50`
                              }`}
                              onClick={() => {
                                const newExpanded = new Set(expandedCostBreakdown)
                                if (newExpanded.has(member.id)) {
                                  newExpanded.delete(member.id)
                                } else {
                                  newExpanded.add(member.id)
                                }
                                setExpandedCostBreakdown(newExpanded)
                              }}
                            >
                              <svg className={`w-4 h-4 inline mr-2 transition-transform duration-200 ${
                                expandedCostBreakdown.has(member.id) ? 'rotate-180' : ''
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              {expandedCostBreakdown.has(member.id) ? 'Hide Cost Breakdown' : 'Cost Breakdown'}
                            </button>
                            <button 
                              className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
                                expandedMembers.has(member.id) 
                                  ? 'bg-white/20 text-white border-white/30 hover:bg-gray-50' 
                                  : `bg-white ${memberColors.accent} border-white hover:bg-gray-50`
                              }`}
                              onClick={() => {
                                const newExpanded = new Set(expandedMembers)
                                if (newExpanded.has(member.id)) {
                                  newExpanded.delete(member.id)
                                } else {
                                  newExpanded.add(member.id)
                                }
                                setExpandedMembers(newExpanded)
                              }}
                            >
                              <svg className={`w-4 h-4 inline mr-2 transition-transform duration-200 ${
                                expandedMembers.has(member.id) ? 'rotate-180' : ''
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              {expandedMembers.has(member.id) ? 'Hide History' : 'See History'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    {Object.keys(memberBreakdown).length > 0 && expandedCostBreakdown.has(member.id) && (
                      <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <svg className={`w-5 h-5 ${memberColors.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Cost Breakdown
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(memberBreakdown).map(([itemName, details]) => (
                            <div key={itemName} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-800">{itemName}</span>
                                <span className="text-sm text-gray-500">{details.meals} meals</span>
                              </div>
                              <div className="space-y-1 mb-3">
                                <div className="text-sm text-gray-600">
                                  Per Meal Cost: {currency(details.perMealCost)}
                                </div>
                                {details.perMealMasalaCost > 0 && (
                                  <div className="text-sm text-orange-600">
                                    Per Meal Masala Cost: {currency(details.perMealMasalaCost)}
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-sm">
                                  {details.totalMasalaCost > 0 && (
                                    <div className="text-gray-500">Masala: {currency(details.totalMasalaCost)}</div>
                                  )}
                              </div>
                              <div className="text-right">
                                <span className="text-lg font-bold text-green-600">
                                  {currency(details.totalCost)}
                                </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Grand Total Price</div>
                              <div className="text-xl font-bold text-green-600">{currency(totalCost)}</div>
                          </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Total Masala Cost</div>
                              <div className="text-xl font-bold text-orange-600">{currency(totalMasalaCost)}</div>
                        </div>
                            <div className="text-center">
                              <div className="text-sm text-gray-500">Grand Total</div>
                              <div className="text-2xl font-bold text-blue-600">{currency(totalCost + totalMasalaCost)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Cost Breakdown Placeholder */}
                    {Object.keys(memberBreakdown).length > 0 && !expandedCostBreakdown.has(member.id) && (
                      <div className="p-8 text-center bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <p className="text-green-600 font-medium">Click "Cost Breakdown" to view detailed cost analysis</p>
                        <p className="text-green-500 text-sm mt-1">See item-wise costs, masala costs, and totals</p>
                      </div>
                    )}
                    
                    {/* Meal History */}
                    {memberMeals.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 text-lg">No meals recorded yet</p>
                        <p className="text-gray-400">Start adding meals to see detailed history</p>
      </div>
                    ) : (
                      <>
                        {expandedMembers.has(member.id) && (
                          <div className="p-6">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <svg className={`w-5 h-5 ${memberColors.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Detailed Meal History
                            </h4>
                            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                              <table className="min-w-full">
                                <thead>
                                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Item</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Meal Count</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {memberMeals.map((meal, idx) => {
                                    // Calculate masala cost for this meal
                                    const itemName = shoppingList.find((i) => i.id === meal.itemId)?.name || ''
                                    const itemNameLower = itemName.toLowerCase()
                                    let mealType = ''
                                    if (itemNameLower.includes('daal') || itemNameLower.includes('dal') || itemNameLower.includes('lentil')) {
                                      mealType = 'daal'
                                    } else if (itemNameLower.includes('chicken') || itemNameLower.includes('murgi') || 
                                               itemNameLower.includes('meat') || itemNameLower.includes('beef') || 
                                               itemNameLower.includes('mutton') || itemNameLower.includes('lamb')) {
                                      mealType = 'chicken'
                                    } else if (itemNameLower.includes('fish') || itemNameLower.includes('mach') || 
                                               itemNameLower.includes('shrimp') || itemNameLower.includes('prawn')) {
                                      mealType = 'fish'
                                    } else if (itemNameLower.includes('egg') || itemNameLower.includes('dim')) {
                                      mealType = 'egg'
                                    } else if (itemNameLower.includes('potato') || itemNameLower.includes('alu')) {
                                      mealType = 'potatoVorta'
                                    } else if (itemNameLower.includes('onion') || itemNameLower.includes('peyaj') || 
                                               itemNameLower.includes('tomato') || itemNameLower.includes('carrot') ||
                                               itemNameLower.includes('cucumber') || itemNameLower.includes('cabbage') ||
                                               itemNameLower.includes('cauliflower') || itemNameLower.includes('spinach') ||
                                               itemNameLower.includes('lettuce') || itemNameLower.includes('pepper')) {
                                      mealType = 'vegetables'
                                    }
                                    
                                    const mealMasalaCost = mealType ? calculateTotalMasalaCost(mealType) * meal.mealCount : 0
                                    
                                    return (
                                    <tr key={`${member.id}-${meal.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                        {formatDate(meal.date)}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-900">
                                        {shoppingList.find((i) => i.id === meal.itemId)?.name || 'N/A'}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-right font-semibold text-indigo-600">
                                        {meal.mealCount}
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                        <button
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all duration-200"
                                          onClick={() => setMeals((arr) => arr.filter((m) => m.id !== meal.id))}
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
        </button>
                                      </td>
                                    </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {!expandedMembers.has(member.id) && (
                          <div className="p-8 text-center bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                            <p className="text-blue-600 font-medium">Click "See History" to view detailed meal history</p>
                            <p className="text-blue-500 text-sm mt-1">Get insights into daily consumption patterns</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Download Summary Section */}
        <section className="bg-gradient-to-br from-white via-gray-50/50 to-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8 mt-8 mb-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent mb-4">
              📊 Complete Summary Report
            </h2>
            <p className="text-gray-600 mb-6">Download a comprehensive invoice-style summary of all members' costs</p>
            
            <button
              onClick={exportSummaryPDF}
              className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 mx-auto"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Summary PDF
            </button>
          </div>
        </section>

        {/* Masala Cost Calculator */}
        <section className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 shadow-2xl border border-orange-200/50 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600 mb-4">
              🧂 Calculate Your Ingredients and Masala Cost (Optional)
            </h2>
            <p className="text-gray-600 text-lg">Calculate masala usage and cost per meal for various meal types (If you add, it will be calculated automatically in above)</p>
            
            {/* Master Clear Button */}
            <div className="mt-6">
              <button
                onClick={clearAllInputs}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 mx-auto"
                title="Clear all inputs in meal counts, masala items, and daily meal entry"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                🗑️ Clear All Inputs
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Meal Counts */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                Enter Your Meal Counts
              </h3>
              
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Enter the number of meals for each category</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadMealCountsByItems}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    title="Load meal counts from your recorded meals data"
                  >
                    📊 Load Meal Counts
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        daalMeals: '',
                        chickenMeals: '',
                        fishMeals: '',
                        eggMeals: '',
                        vegetableMeals: '',
                        potatoVortaMeals: ''
                      }))
                      alert('Meal counts cleared successfully!')
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    title="Clear all meal count inputs"
                  >
                    🗑️ Clear Meal Counts
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Daal Curry</span>
                  <input
                    type="number"
                    min="0"
                    className="input w-full bg-white/70 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={form.daalMeals || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, daalMeals: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Chicken Curry</span>
                  <input
                    type="number"
                    min="0"
                    className="input w-full bg-white/70 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={form.chickenMeals || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, chickenMeals: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Fish Curry</span>
                  <input
                    type="number"
                    min="0"
                    className="input w-full bg-white/70 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={form.fishMeals || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, fishMeals: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Egg Curry</span>
                  <input
                    type="number"
                    min="0"
                    className="input w-full bg-white/70 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={form.eggMeals || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, eggMeals: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Vegetables</span>
                  <input
                    type="number"
                    min="0"
                    className="input w-full bg-white/70 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={form.vegetableMeals || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, vegetableMeals: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700">Potato Mash</span>
                  <input
                    type="number"
                    min="0"
                    className="input w-full bg-white/70 border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    value={form.potatoVortaMeals || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, potatoVortaMeals: e.target.value === '' ? '' : Number(e.target.value) }))}
                  />
                </label>
              </div>
            </div>

            {/* Masala Selection */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Select Masala & Other Ingredients</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={loadPricesFromPurchases}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    title="Load prices from your purchase list"
                  >
                    📥 Load Prices From Purchases
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          onion: { cost: '' },
                          potato: { cost: '' },
                          turmeric: { cost: '' },
                          chili: { cost: '' },
                          ginger: { cost: '' },
                          garlic: { cost: '' },
                          chickenMasala: { cost: '' },
                          oil: { cost: '' },
                          tomato: { cost: '' },
                          goromMasala: { cost: '' }
                        }
                      }))
                      alert('Masala item costs cleared successfully!')
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                    title="Clear all masala item costs"
                  >
                    🗑️ Clear Costs
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <label className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Peyaj (Onion)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.onion.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          onion: {
                            ...prev.masalaItems.onion,
                            cost: e.target.value === '' ? 0 : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-orange-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Alu (Potato)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-orange-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.potato.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          potato: {
                            ...prev.masalaItems.potato,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-orange-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Holud (Turmeric)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-yellow-200 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.turmeric.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          turmeric: {
                            ...prev.masalaItems.turmeric,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-yellow-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Morich (Chili)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.chili.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          chili: {
                            ...prev.masalaItems.chili,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-red-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Ada (Ginger)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.ginger.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          ginger: {
                            ...prev.masalaItems.ginger,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-green-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Roshun (Garlic)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.garlic.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          garlic: {
                            ...prev.masalaItems.garlic,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-indigo-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Murgir Moshla (Chicken Masala)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-pink-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.chickenMasala.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          chickenMasala: {
                            ...prev.masalaItems.chickenMasala,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-pink-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Tel (Oil)</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.oil.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          oil: {
                            ...prev.masalaItems.oil,
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-amber-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                
                <label className="space-y-3 p-4 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Tomato</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.tomato.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          tomato: { cost: e.target.value === '' ? '' : Number(e.target.value) || 0 }
                        }
                      }))}
                    />
                    <span className="text-red-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
                <label className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50 hover:shadow-md transition-all duration-200">
                  <span className="text-sm font-semibold text-gray-700">Gorom Moshla</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input w-full bg-white/80 border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0.00"
                      value={form.masalaItems.goromMasala.cost || ''}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        masalaItems: {
                          ...prev.masalaItems,
                          goromMasala: { 
                            cost: e.target.value === '' ? '' : Number(e.target.value) || 0
                          }
                        }
                      }))}
                    />
                    <span className="text-purple-600 font-bold text-sm whitespace-nowrap">BDT</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Calculation Results */}
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-white/20">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              Cost Breakdown Per Meal Type
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Daal Curry */}
              {(form.daalMeals || 0) > 0 && (
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-md hover:shadow-lg transition-all duration-200">
                  <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    Daal Curry
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Onion:</span>
                      <span className="font-semibold text-blue-900">{currency(calculateMasalaCost('daal', 'onion'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Turmeric:</span>
                      <span className="font-semibold text-blue-900">{currency(calculateMasalaCost('daal', 'turmeric'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Garlic:</span>
                      <span className="font-semibold text-blue-900">{currency(calculateMasalaCost('daal', 'garlic'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Oil:</span>
                      <span className="font-semibold text-blue-900">{currency(calculateMasalaCost('daal', 'oil'))}</span>
                    </div>
                    <div className="border-t border-blue-300 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-blue-800">Total:</span>
                        <span className="text-blue-900">{currency(calculateTotalMasalaCost('daal'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chicken Curry */}
              {(form.chickenMeals || 0) > 0 && (
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 shadow-md hover:shadow-lg transition-all duration-200">
                  <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    Chicken Curry
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Onion:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'onion'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Potato:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'potato'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Turmeric:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'turmeric'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Chili:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'chili'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Ginger:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'ginger'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Garlic:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'garlic'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Chicken Masala:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'chickenMasala'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Gorom Moshla:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'goromMasala'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Oil:</span>
                      <span className="font-semibold text-green-900">{currency(calculateMasalaCost('chicken', 'oil'))}</span>
                    </div>
                    <div className="border-t border-green-300 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-green-800">Total:</span>
                        <span className="text-green-900">{currency(calculateTotalMasalaCost('chicken'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fish Curry */}
              {(form.fishMeals || 0) > 0 && (
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <h4 className="text-sm font-medium text-teal-800 mb-2">Fish Curry</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-teal-700">Onion:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'onion'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Potato:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'potato'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Turmeric:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'turmeric'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Chili:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'chili'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Ginger:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'ginger'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Garlic:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'garlic'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Oil:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'oil'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Tomato:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'tomato'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-teal-700">Gorom Moshla:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('fish', 'goromMasala'))}</span>
                    </div>
                    <div className="border-t border-teal-300 pt-1 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-teal-800">Total:</span>
                        <span className="text-teal-900">{currency(calculateTotalMasalaCost('fish'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Egg Curry */}
              {(form.eggMeals || 0) > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Egg Curry</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Onion:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'onion'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Turmeric:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'turmeric'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Chili:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'chili'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Ginger:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'ginger'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Garlic:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'garlic'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Oil:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'oil'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Gorom Moshla:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('egg', 'goromMasala'))}</span>
                    </div>
                    <div className="border-t border-yellow-300 pt-1 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-yellow-800">Total:</span>
                        <span className="text-yellow-900">{currency(calculateTotalMasalaCost('egg'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Vegetables */}
              {(form.vegetableMeals || 0) > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h5 className="text-sm font-medium text-green-800 mb-2">Vegetables</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700">Onion:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'onion'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Potato:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'potato'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Turmeric:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'turmeric'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Chili:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'chili'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Ginger:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'ginger'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Garlic:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'garlic'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Oil:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'oil'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Gorom Moshla:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('vegetables', 'goromMasala'))}</span>
                    </div>

                    <div className="border-t border-green-300 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-green-800">Total:</span>
                        <span className="text-green-900">{currency(calculateTotalMasalaCost('vegetables'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Potato Mash */}
              {(form.potatoVortaMeals || 0) > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">Potato Mash</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">Onion:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('potatoVorta', 'onion'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">Potato:</span>
                      <span className="font-medium">{currency(calculateMasalaCost('potatoVorta', 'potato'))}</span>
                    </div>
                    <div className="border-t border-purple-300 pt-1 mt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-purple-800">Total:</span>
                        <span className="text-purple-900">{currency(calculateTotalMasalaCost('potatoVorta'))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
              <h4 className="text-lg font-semibold text-gray-800 mb-3">Summary</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {currency(calculateGrandTotalMasalaCost())}
                  </div>
                  <div className="text-sm text-gray-600">Total Masala Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {calculateTotalMeals()}
                  </div>
                  <div className="text-sm text-gray-600">Total Meals</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Floating Action Button */}
      <div className="fixed bottom-6 right-6 lg:hidden z-20">
        <div className="bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </div>
    </div>
  )
}
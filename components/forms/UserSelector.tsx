'use client'

import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/Input'

interface User {
  id: string
  email: string
  name: string
}

interface UserSelectorProps {
  selectedUsers: User[]
  onUsersChange: (users: User[]) => void
  allowExternal?: boolean
  label?: string
  error?: string
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALL_STAFF_TOKEN = 'allstaff'

export function UserSelector({
  selectedUsers,
  onUsersChange,
  allowExternal = true,
  label,
  error,
}: UserSelectorProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const addChip = (user: User) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      return
    }
    onUsersChange([...selectedUsers, user])
  }

  const addAllStaffEntry = () => {
    addChip({
      id: ALL_STAFF_TOKEN,
      email: 'allstaff@nac.com.np',
      name: 'ALL STAFF',
    })
  }

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inputValue.length < 2) {
        setSuggestions([])
        setShowSuggestions(false)
        return
      }

      const lowerInput = inputValue.toLowerCase().trim()
      const allStaffMatches = 
        lowerInput === 'all' ||
        lowerInput === 'staff' ||
        lowerInput.startsWith('allstaff') ||
        lowerInput.includes('all staff')

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(inputValue)}`)
        if (response.ok) {
          const data = await response.json()
          const filtered = data.users.filter(
            (user: User) => !selectedUsers.some((su) => su.id === user.id)
          )
          
          
          const allStaffAlreadySelected = selectedUsers.some(u => u.id === ALL_STAFF_TOKEN)
          if (allStaffMatches && !allStaffAlreadySelected) {
            filtered.unshift({
              id: ALL_STAFF_TOKEN,
              email: 'allstaff@nac.com.np',
              name: 'ALL STAFF',
            })
          }
          
          setSuggestions(filtered)
          setShowSuggestions(filtered.length > 0)
        }
      } catch (error) {
        console.error('Error fetching user suggestions:', error)
      }
    }

    fetchSuggestions()
  }, [inputValue, selectedUsers])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const addExternalEntry = (rawValue: string) => {
    if (!allowExternal) return
    const trimmed = rawValue.trim()
    if (!trimmed) return

    const lowerValue = trimmed.toLowerCase()
    if (lowerValue === 'allstaff' || lowerValue === 'allstaff@nac.com.np') {
      addAllStaffEntry()
      return
    }

    if (emailRegex.test(trimmed)) {
      const normalizedEmail = trimmed.toLowerCase()
      addChip({
        id: `external-email:${normalizedEmail}`,
        email: normalizedEmail,
        name: normalizedEmail,
      })
    } else {
      const upperName = trimmed.toUpperCase()
      addChip({
        id: `external-name:${upperName}`,
        email: '',
        name: upperName,
      })
    }
  }

  const processTokenizedInput = (value: string) => {
    const parts = value.split(',')
    if (parts.length === 1) {
      setInputValue(value)
      return
    }

    const tokens = parts.slice(0, -1)
    tokens.forEach((token: string) => addExternalEntry(token))
    setInputValue(parts[parts.length - 1])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.includes(',')) {
      processTokenizedInput(value)
    } else {
      setInputValue(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (suggestions.length > 0 && !emailRegex.test(trimmed)) {
        handleSelectUser(suggestions[0])
      } else if (allowExternal) {
        addExternalEntry(trimmed)
      }
      setInputValue('')
      setShowSuggestions(false)
    } else if (e.key === 'Backspace' && !inputValue && selectedUsers.length > 0) {
      onUsersChange(selectedUsers.slice(0, -1))
    }
  }

  const handleSelectUser = (user: User) => {
    addChip(user)
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  const handleRemoveUser = (userId: string) => {
    onUsersChange(selectedUsers.filter((u) => u.id !== userId))
  }

  return (
    <div ref={containerRef} className="w-full relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div
        className={`min-h-[42px] w-full px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      >
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
            >
              {user.name || user.email}
              <button
                type="button"
                onClick={() => handleRemoveUser(user.id)}
                className="hover:text-blue-600"
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
            placeholder={
              selectedUsers.length === 0
                ? 'Type email or name (use commas to separate)...'
                : ''
            }
            className="flex-1 min-w-[120px] outline-none bg-transparent"
          />
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((user) => {
            const isAllStaff = user.id === ALL_STAFF_TOKEN
            return (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelectUser(user)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                  isAllStaff ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className={`font-medium ${isAllStaff ? 'text-blue-900' : 'text-gray-900'}`}>
                  {user.name}
                  {isAllStaff && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Special</span>}
                </div>
                <div className={`text-sm ${isAllStaff ? 'text-blue-700' : 'text-gray-500'}`}>
                  {user.email}
                  {isAllStaff && <span className="ml-2 text-xs text-blue-600">(All staff members)</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}


"use client"

import { useState } from "react"
import SearchBar from "./SearchBar"
import SidebarWrapper from "./SidebarWrapper"

type ServerRoom = {
  id: string
  name: string
  icon: string
  description: string | null
  isPinned: boolean
  pinnedAt: string | null
  userId: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
  messages: { text: string; createdAt: string }[]
}

type Props = {
  serverRooms: ServerRoom[]
}

export default function SidebarSection({ serverRooms }: Props) {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <>
      <SearchBar query={searchQuery} onQueryChange={setSearchQuery} />
      <SidebarWrapper serverRooms={serverRooms} searchQuery={searchQuery} />
    </>
  )
}

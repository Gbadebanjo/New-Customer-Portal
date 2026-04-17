import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SupportDetailsClient from './SupportDetailsClient'
import AddSupportMessage from '@/lib/controllers/supportQuery/AddSupportMessage'
import ResolveSupportQueryById from '@/lib/controllers/supportQuery/ResolveSupportQueryById'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/lib/controllers/supportQuery/AddSupportMessage', () =>
  jest.fn().mockResolvedValue({})
)
jest.mock('@/lib/controllers/supportQuery/ResolveSupportQueryById', () =>
  jest.fn().mockResolvedValue({})
)
jest.mock('../Context/userContext', () => ({
  useUser: () => ({ user: { id: 'user-123' } }),
}))
jest.mock('next/link', () => {
  const Link = ({ children, href }) => <a href={href}>{children}</a>
  Link.displayName = 'Link'
  return Link
})
jest.mock('react-icons/fa', () => ({
  FaCheck: () => <span data-testid="fa-check" />,
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockStatuses = [
  { id: 1, name: 'New' },
  { id: 2, name: 'Active' },
  { id: 3, name: 'Resolved' },
  { id: 4, name: 'Reopened' },
]

const mockCategories = [{ id: 1, name: 'Billing' }]

function makeSupportQuery(overrides = {}) {
  return {
    supportQuery: {
      id: 'query-1',
      title: 'Test Query Title',
      status_id: 1,
      category_id: 1,
      user: { id: 'sender-1', email: 'sender@example.com' },
      messages: [],
      ...overrides,
    },
  }
}

function renderComponent(supportQueryById, statusOverride) {
  const statuses = statusOverride ?? mockStatuses
  return render(
    <SupportDetailsClient
      allSupportQueryStatuses={statuses}
      allSupportQueryCategories={mockCategories}
      supportQueryById={supportQueryById}
    />
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SupportDetailsClient', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Loading state ──────────────────────────────────────────────────────────

  it('renders a loading message when supportQuery is missing', () => {
    renderComponent({ supportQuery: null })
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders a loading message when supportQueryById is an empty object', () => {
    renderComponent({})
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  // ── Header ─────────────────────────────────────────────────────────────────

  it('renders the support query title', () => {
    renderComponent(makeSupportQuery())
    // Title appears in both the page header and the detail row — target the heading specifically
    expect(screen.getByRole('heading', { level: 1, name: 'Test Query Title' })).toBeInTheDocument()
  })

  it('renders a "Back to Support" link pointing to /support', () => {
    renderComponent(makeSupportQuery())
    const link = screen.getByRole('link', { name: /back to support/i })
    expect(link).toHaveAttribute('href', '/support')
  })

  // ── Status tags ────────────────────────────────────────────────────────────

  it('renders the NEW tag for status_id matching "New"', () => {
    renderComponent(makeSupportQuery({ status_id: 1 }))
    expect(screen.getByRole('button', { name: /new/i })).toBeInTheDocument()
  })

  it('renders the ACTIVE tag for status_id matching "Active"', () => {
    renderComponent(makeSupportQuery({ status_id: 2 }))
    expect(screen.getByRole('button', { name: /active/i })).toBeInTheDocument()
  })

  it('renders the RESOLVED tag for status_id matching "Resolved"', () => {
    renderComponent(makeSupportQuery({ status_id: 3 }))
    expect(screen.getByRole('button', { name: /resolved/i })).toBeInTheDocument()
  })

  it('renders the REOPENED tag for status_id matching "Reopened"', () => {
    renderComponent(makeSupportQuery({ status_id: 4 }))
    expect(screen.getByRole('button', { name: /reopened/i })).toBeInTheDocument()
  })

  it('renders no status tag for an unknown status_id', () => {
    renderComponent(makeSupportQuery({ status_id: 99 }))
    expect(screen.queryByRole('button', { name: /new|active|resolved|reopened/i })).toBeNull()
  })

  // ── Support details ────────────────────────────────────────────────────────

  it("renders the sender's email", () => {
    renderComponent(makeSupportQuery())
    expect(screen.getByText('sender@example.com')).toBeInTheDocument()
  })

  it('renders the support category', () => {
    renderComponent(makeSupportQuery({ category_id: 1 }))
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  it('renders an empty category for an unknown category_id', () => {
    renderComponent(makeSupportQuery({ category_id: 999 }))
    // Category resolves to empty string — Billing should not appear
    expect(screen.queryByText('Billing')).not.toBeInTheDocument()
  })

  // ── Message history ────────────────────────────────────────────────────────

  it('renders "No messages yet." when messages array is empty', () => {
    renderComponent(makeSupportQuery({ messages: [] }))
    expect(screen.getByText('No messages yet.')).toBeInTheDocument()
  })

  it('renders each message with sender email and content', () => {
    const messages = [
      {
        id: 'msg-1',
        user: { email: 'agent@example.com' },
        message: 'Hello, how can I help?',
        created_at: '2024-01-01T10:00:00Z',
      },
      {
        id: 'msg-2',
        user: null,
        message: 'Follow-up message',
        created_at: null,
      },
    ]
    renderComponent(makeSupportQuery({ messages }))

    expect(screen.getByText('agent@example.com')).toBeInTheDocument()
    expect(screen.getByText('Hello, how can I help?')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('Follow-up message')).toBeInTheDocument()
  })

  // ── Send message form ──────────────────────────────────────────────────────

  it('updates the textarea as the user types', async () => {
    const user = userEvent.setup()
    renderComponent(makeSupportQuery())

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'My response')

    expect(textarea).toHaveValue('My response')
  })

  it('calls AddSupportMessage with the correct args on form submit', async () => {
    const user = userEvent.setup()
    renderComponent(makeSupportQuery())

    await user.type(screen.getByRole('textbox'), 'Test response text')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(AddSupportMessage).toHaveBeenCalledWith({
        support_query_id: 'query-1',
        user_id: 'user-123',
        response: 'Test response text',
      })
    })
  })

  it('clears the textarea after a successful form submission', async () => {
    const user = userEvent.setup()
    renderComponent(makeSupportQuery())

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test response')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(textarea).toHaveValue('')
    })
  })

  it('does not clear the textarea if AddSupportMessage throws', async () => {
    AddSupportMessage.mockRejectedValueOnce(new Error('Network error'))
    const user = userEvent.setup()
    renderComponent(makeSupportQuery())

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Test response')
    await user.click(screen.getByRole('button', { name: /send message/i }))

    await waitFor(() => {
      expect(textarea).toHaveValue('Test response')
    })
  })

  // ── Resolve button ─────────────────────────────────────────────────────────

  it('calls ResolveSupportQueryById with the query id when Resolve is clicked', async () => {
    const user = userEvent.setup()
    renderComponent(makeSupportQuery())

    await user.click(screen.getByRole('button', { name: /resolve this query/i }))

    await waitFor(() => {
      expect(ResolveSupportQueryById).toHaveBeenCalledWith('query-1')
    })
  })

  it('shows "Resolving…" text while the resolve request is in flight', async () => {
    // Keep the promise pending so we can inspect mid-flight state
    let resolvePromise
    ResolveSupportQueryById.mockReturnValueOnce(
      new Promise((res) => { resolvePromise = res })
    )

    const user = userEvent.setup()
    renderComponent(makeSupportQuery())

    await user.click(screen.getByRole('button', { name: /resolve this query/i }))

    expect(await screen.findByText('Resolving…')).toBeInTheDocument()

    // Resolve the promise inside act so the setLoading(false) state update is flushed cleanly
    await act(async () => { resolvePromise() })
  })

  it('does not call ResolveSupportQueryById when supportQuery id is missing', async () => {
    const user = userEvent.setup()
    renderComponent(makeSupportQuery({ id: undefined }))

    await user.click(screen.getByRole('button', { name: /resolve this query/i }))

    expect(ResolveSupportQueryById).not.toHaveBeenCalled()
  })
})

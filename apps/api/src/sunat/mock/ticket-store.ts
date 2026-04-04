// In-memory ticket store for async operation simulation

export interface TicketRecord {
  ticket: string;
  ruc: string;
  operation: string;
  status: 'processing' | 'resolved';
  attempts: number;
  finalCode: number | null;
  createdAt: Date;
  resolvedAt?: Date;
}

class TicketStoreClass {
  private tickets: Map<string, TicketRecord> = new Map();

  /**
   * Create a new ticket and return its ID (15-digit string)
   */
  createTicket(ruc: string, operation: string): string {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const ticket = `${timestamp}${random}`.padStart(15, '0');

    this.tickets.set(ticket, {
      ticket,
      ruc,
      operation,
      status: 'processing',
      attempts: 0,
      finalCode: null,
      createdAt: new Date(),
    });

    console.log(`[MockSUNAT] Ticket created: ${ticket} (operation: ${operation})`);
    return ticket;
  }

  /**
   * Get a ticket record by ID
   */
  getTicket(ticket: string): TicketRecord | undefined {
    return this.tickets.get(ticket);
  }

  /**
   * Resolve a ticket to a final status code
   */
  resolveTicket(ticket: string, code: number): void {
    const record = this.tickets.get(ticket);
    if (record && record.status === 'processing') {
      record.status = 'resolved';
      record.finalCode = code;
      record.resolvedAt = new Date();
      console.log(`[MockSUNAT] Ticket resolved: ${ticket} -> code ${code}`);
    }
  }

  /**
   * Get all tickets
   */
  getAllTickets(): TicketRecord[] {
    return Array.from(this.tickets.values());
  }

  /**
   * Get ticket count
   */
  get count(): number {
    return this.tickets.size;
  }

  /**
   * Reset all tickets
   */
  reset(): void {
    this.tickets.clear();
    console.log('[MockSUNAT] All tickets cleared');
  }
}

export const ticketStore = new TicketStoreClass();

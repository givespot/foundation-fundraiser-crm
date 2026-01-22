export interface EmailOptions {
    to: string;
    subject: string;
    body: string;
    html?: boolean;
    sequenceId?: string;
    leadId?: string;
    memberId?: string;
    stepNumber?: number;
}
export interface EmailResult {
    success: boolean;
    messageId?: string;
    trackingId?: string;
    error?: string;
}
export declare function verifyConnection(): Promise<boolean>;
export declare function sendEmail(options: EmailOptions): Promise<EmailResult>;
export declare function sendSequenceEmail(sequenceId: string, memberId: string, stepNumber: number, memberData: {
    email: string;
    full_name: string;
    organization?: string;
}): Promise<EmailResult>;
export declare function sendNotificationEmail(to: string, subject: string, message: string): Promise<EmailResult>;
declare const _default: {
    sendEmail: typeof sendEmail;
    sendSequenceEmail: typeof sendSequenceEmail;
    sendNotificationEmail: typeof sendNotificationEmail;
    verifyConnection: typeof verifyConnection;
};
export default _default;
//# sourceMappingURL=emailService.d.ts.map
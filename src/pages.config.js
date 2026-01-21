import CreateSequence from './pages/CreateSequence';
import Dashboard from './pages/Dashboard';
import EmailSequences from './pages/EmailSequences';
import InviteUser from './pages/InviteUser';
import LeadDetails from './pages/LeadDetails';
import Leads from './pages/Leads';
import Members from './pages/Members';
import NewLead from './pages/NewLead';
import Reports from './pages/Reports';
import SequenceDetails from './pages/SequenceDetails';
import Settings from './pages/Settings';
import MemberOnboarding from './pages/MemberOnboarding';
import AuditLogs from './pages/AuditLogs';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CreateSequence": CreateSequence,
    "Dashboard": Dashboard,
    "EmailSequences": EmailSequences,
    "InviteUser": InviteUser,
    "LeadDetails": LeadDetails,
    "Leads": Leads,
    "Members": Members,
    "NewLead": NewLead,
    "Reports": Reports,
    "SequenceDetails": SequenceDetails,
    "Settings": Settings,
    "MemberOnboarding": MemberOnboarding,
    "AuditLogs": AuditLogs,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
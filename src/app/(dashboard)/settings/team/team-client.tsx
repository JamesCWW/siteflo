'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { inviteTeamMember, updateMemberRole, deactivateMember, reactivateMember } from '@/actions/team';
import { toast } from 'sonner';
import { UserPlus, MoreVertical } from 'lucide-react';

type Member = {
  id: string;
  fullName: string;
  email: string;
  role: 'owner' | 'admin' | 'technician';
  isActive: boolean;
};

interface TeamClientProps {
  members: Member[];
  currentUserId: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  technician: 'Technician',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  admin: 'secondary',
  technician: 'outline',
};

export function TeamClient({ members: initialMembers, currentUserId }: TeamClientProps) {
  const [members, setMembers] = useState(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'technician'>('technician');
  const [inviting, setSaving] = useState(false);

  async function handleInvite() {
    setSaving(true);
    const result = await inviteTeamMember({ email: inviteEmail, role: inviteRole });
    setSaving(false);
    if (result.success) {
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail('');
    } else {
      toast.error(result.error ?? 'Failed to send invite');
    }
  }

  async function handleRoleChange(memberId: string, role: 'admin' | 'technician') {
    const result = await updateMemberRole(memberId, role);
    if (result.success) {
      setMembers((ms) => ms.map((m) => m.id === memberId ? { ...m, role } : m));
      toast.success('Role updated');
    } else {
      toast.error(result.error ?? 'Failed to update role');
    }
  }

  async function handleDeactivate(memberId: string) {
    const result = await deactivateMember(memberId);
    if (result.success) {
      setMembers((ms) => ms.map((m) => m.id === memberId ? { ...m, isActive: false } : m));
      toast.success('Member deactivated');
    } else {
      toast.error(result.error ?? 'Failed to deactivate member');
    }
  }

  async function handleReactivate(memberId: string) {
    const result = await reactivateMember(memberId);
    if (result.success) {
      setMembers((ms) => ms.map((m) => m.id === memberId ? { ...m, isActive: true } : m));
      toast.success('Member reactivated');
    } else {
      toast.error(result.error ?? 'Failed to reactivate member');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Team members</h2>
          <p className="text-sm text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="h-12 gap-2">
          <UserPlus className="h-4 w-4" />
          Invite member
        </Button>
      </div>

      <div className="divide-y border rounded-lg overflow-hidden">
        {members.map((member) => (
          <div key={member.id} className={`flex items-center gap-4 px-4 py-4 bg-card ${!member.isActive ? 'opacity-50' : ''}`}>
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {member.fullName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium truncate">{member.fullName}</p>
                {!member.isActive && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            </div>

            {/* Role badge */}
            <Badge variant={ROLE_VARIANTS[member.role] ?? 'outline'} className="shrink-0">
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>

            {/* Actions */}
            {member.id !== currentUserId && member.role !== 'owner' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'technician' : 'admin')}>
                    Change to {member.role === 'admin' ? 'Technician' : 'Admin'}
                  </DropdownMenuItem>
                  {member.isActive ? (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDeactivate(member.id)}
                    >
                      Deactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleReactivate(member.id)}>
                      Reactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}
      </div>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email address</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="technician@example.com"
                className="h-12"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'technician')}>
                <SelectTrigger id="inviteRole" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              They&apos;ll receive a magic link to sign in. On first login they can complete their profile.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)} className="h-12">
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="h-12">
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

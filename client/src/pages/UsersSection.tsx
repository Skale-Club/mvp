import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Pencil, Trash2, Check, Users, Camera } from 'lucide-react';

// User type for the users section
interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string;
  isAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
}

export function UsersSection() {
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserData | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const { data: users, isLoading } = useQuery<UserData[]>({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/users');
      return res.json();
    }
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; firstName?: string; lastName?: string; profileImageUrl?: string; isAdmin?: boolean }) => {
      const res = await apiRequest('PATCH', `/api/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User updated successfully' });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating user',
        description: error?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: 'User deleted successfully' });
      setDeletingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting user',
        description: error?.message || 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await apiRequest('POST', '/api/upload', {
        filename: file.name,
        data: base64Data,
        contentType: file.type,
      });
      const { path } = await res.json();
      setEditingUser(prev => prev ? { ...prev, profileImageUrl: path } : null);
    } catch {
      toast({ title: 'Error uploading avatar', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getDisplayName = (user: UserData) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName} ${user.lastName}`.trim();
    }
    return 'Unnamed User';
  };

  const getInitials = (user: UserData) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-muted-foreground">Manage user permissions</p>
        </div>
      </div>

      {/* Users Table */}
      <Card className="border border-border/30 shadow-none">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : !users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-40" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/50">
                    <th className="text-left px-6 py-4 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-6 py-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-6 py-4 font-medium text-muted-foreground">Role</th>
                    <th className="text-right px-6 py-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border/30 last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt={getDisplayName(user)}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                              {getInitials(user)}
                            </div>
                          )}
                          <span className="font-medium">{getDisplayName(user)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        {user.isAdmin ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Admin</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-400 hover:bg-yellow-500 text-black">User</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog open={editingUser?.id === user.id} onOpenChange={(open) => !open && setEditingUser(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEditingUser(user)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                              </DialogHeader>
                              <div className="py-4 space-y-4">
                                {/* Avatar upload */}
                                <div className="flex items-center gap-4">
                                  <div className="relative group">
                                    {editingUser?.profileImageUrl ? (
                                      <img
                                        src={editingUser.profileImageUrl}
                                        alt={getDisplayName(user)}
                                        className="w-16 h-16 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium text-xl">
                                        {getInitials(editingUser ?? user)}
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      onClick={() => avatarInputRef.current?.click()}
                                      disabled={uploadingAvatar}
                                    >
                                      {uploadingAvatar ? (
                                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                                      ) : (
                                        <Camera className="w-5 h-5 text-white" />
                                      )}
                                    </button>
                                    <input
                                      ref={avatarInputRef}
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleAvatarUpload(file);
                                        e.target.value = '';
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`edit-firstName-${user.id}`}>First Name</Label>
                                    <Input
                                      id={`edit-firstName-${user.id}`}
                                      value={editingUser?.firstName ?? ''}
                                      onChange={(e) =>
                                        setEditingUser(prev => prev ? { ...prev, firstName: e.target.value } : null)
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`edit-lastName-${user.id}`}>Last Name</Label>
                                    <Input
                                      id={`edit-lastName-${user.id}`}
                                      value={editingUser?.lastName ?? ''}
                                      onChange={(e) =>
                                        setEditingUser(prev => prev ? { ...prev, lastName: e.target.value } : null)
                                      }
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`edit-isAdmin-${user.id}`}
                                    checked={editingUser?.isAdmin ?? user.isAdmin}
                                    onCheckedChange={(checked) =>
                                      setEditingUser(prev => prev ? { ...prev, isAdmin: checked as boolean } : null)
                                    }
                                  />
                                  <Label htmlFor={`edit-isAdmin-${user.id}`} className="cursor-pointer">
                                    Admin privileges
                                  </Label>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingUser(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => editingUser && updateUser.mutate({
                                    id: user.id,
                                    firstName: editingUser.firstName,
                                    lastName: editingUser.lastName,
                                    profileImageUrl: editingUser.profileImageUrl,
                                    isAdmin: editingUser.isAdmin,
                                  })}
                                  disabled={updateUser.isPending}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  {updateUser.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                  )}
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog open={deletingUser?.id === user.id} onOpenChange={(open) => !open && setDeletingUser(null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeletingUser(user)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{getDisplayName(user)}</strong> ({user.email})?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeletingUser(null)}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser.mutate(user.id)}
                                  disabled={deleteUser.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleteUser.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                  )}
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

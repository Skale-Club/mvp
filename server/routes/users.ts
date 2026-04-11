import type { Express } from "express";
import { db } from "../db.js";
import { users } from "#shared/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { safeErrorMessage } from "./errorUtils.js";

/**
 * Register user management routes
 */
export function registerUserRoutes(app: Express, requireAdmin: any) {
  
  // Get all users from Supabase Auth and local DB
  app.get('/api/users', requireAdmin, async (_req, res) => {
    try {
      const { getSupabaseAdmin } = await import('../lib/supabase.js');
      const supabaseAdmin = getSupabaseAdmin();
      
      // Fetch users from Supabase Auth
      const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.error('Error fetching users from Supabase:', error);
        return res.status(500).json({ message: 'Failed to fetch users from Supabase' });
      }

      // Fetch local user data (roles, names)
      const localUsers = await db.select().from(users);
      const localUserMap = new Map(localUsers.map(u => [u.id, u]));

      // Merge Supabase auth data with local DB data
      const mergedUsers = authUsers.users.map(authUser => {
        const localUser = localUserMap.get(authUser.id);
        return {
          id: authUser.id,
          email: authUser.email,
          firstName: localUser?.firstName ?? authUser.user_metadata?.first_name ?? '',
          lastName: localUser?.lastName ?? authUser.user_metadata?.last_name ?? '',
          profileImageUrl: localUser?.profileImageUrl ?? authUser.user_metadata?.avatar_url ?? '',
          isAdmin: localUser?.isAdmin ?? false,
          createdAt: authUser.created_at,
          lastSignInAt: authUser.last_sign_in_at,
          emailConfirmed: authUser.email_confirmed_at != null,
        };
      });

      res.json(mergedUsers);
    } catch (err) {
      console.error('Error in /api/users:', err);
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  // Create a new user via Supabase Auth
  app.post('/api/users', requireAdmin, async (req, res) => {
    try {
      const createSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().optional().default(''),
        lastName: z.string().optional().default(''),
        isAdmin: z.boolean().optional().default(false),
      });
      const data = createSchema.parse(req.body);

      const { getSupabaseAdmin } = await import('../lib/supabase.js');
      const supabaseAdmin = getSupabaseAdmin();

      // Create user in Supabase Auth
      const { data: authData, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
        },
      });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      const authUser = authData.user;

      // Create local DB record
      const [newUser] = await db
        .insert(users)
        .values({
          id: authUser.id,
          email: authUser.email!,
          firstName: data.firstName,
          lastName: data.lastName,
          profileImageUrl: '',
          isAdmin: data.isAdmin,
        })
        .returning();

      res.status(201).json(newUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  // Update user role (admin status)
  app.patch('/api/users/:id', requireAdmin, async (req, res) => {
    try {
      const updateSchema = z.object({
        isAdmin: z.boolean().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        profileImageUrl: z.string().optional(),
      });
      const updateData = updateSchema.parse(req.body);
      const userId = req.params.id;

      // Get Supabase admin client
      const { getSupabaseAdmin } = await import('../lib/supabase.js');
      const supabaseAdmin = getSupabaseAdmin();

      // Fetch user from Supabase to ensure they exist
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!authUser?.user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update local database
      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));

      let updatedUser;
      if (existingUser) {
        // Update existing user
        const [updated] = await db
          .update(users)
          .set({
            ...(updateData.isAdmin !== undefined && { isAdmin: updateData.isAdmin }),
            ...(updateData.firstName !== undefined && { firstName: updateData.firstName }),
            ...(updateData.lastName !== undefined && { lastName: updateData.lastName }),
            ...(updateData.profileImageUrl !== undefined && { profileImageUrl: updateData.profileImageUrl }),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId))
          .returning();
        updatedUser = updated;
      } else {
        // User exists in Supabase but not in local DB, create entry
        const [newUser] = await db
          .insert(users)
          .values({
            id: userId,
            email: authUser.user.email,
            isAdmin: updateData.isAdmin ?? false,
            firstName: updateData.firstName ?? authUser.user.user_metadata?.first_name ?? '',
            lastName: updateData.lastName ?? authUser.user.user_metadata?.last_name ?? '',
            profileImageUrl: updateData.profileImageUrl ?? authUser.user.user_metadata?.avatar_url ?? '',
          })
          .returning();
        updatedUser = newUser;
      }

      // Update Supabase user_metadata if profile fields were changed
      if (updateData.firstName !== undefined || updateData.lastName !== undefined || updateData.profileImageUrl !== undefined) {
        const metadataUpdate: Record<string, any> = {};
        if (updateData.firstName !== undefined) metadataUpdate.first_name = updateData.firstName;
        if (updateData.lastName !== undefined) metadataUpdate.last_name = updateData.lastName;
        if (updateData.profileImageUrl !== undefined) metadataUpdate.avatar_url = updateData.profileImageUrl;

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { user_metadata: metadataUpdate }
        );

        if (updateError) {
          console.error('Error updating Supabase user_metadata:', updateError);
          // Continue anyway, local DB was updated
        }
      }

      res.json(updatedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: err.errors });
      }
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });

  // Delete user
  app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = req.params.id;

      // Delete from Supabase Auth
      const { getSupabaseAdmin } = await import('../lib/supabase.js');
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (error) {
        console.error('Error deleting user from Supabase:', error);
        return res.status(500).json({ message: 'Failed to delete user from Supabase' });
      }

      // Delete from local database
      await db.delete(users).where(eq(users.id, userId));

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: safeErrorMessage(err, 'Internal server error') });
    }
  });
}

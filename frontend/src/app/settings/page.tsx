"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUserStore } from "@/stores";
import { useCredits } from "@/hooks/use-api";
import { api } from "@/lib/api";
import { updateUserPassword } from "@/lib/auth-service";
import { User, Lock, SlidersHorizontal, CheckCircle2, Mail, Calendar, Shield } from "lucide-react";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function usePreference(key: string, defaultValue: boolean) {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(stored === "true");
    } catch {
      /* localStorage unavailable (private mode, etc.) -- keep default */
    }
  }, [key]);
  const update = (next: boolean) => {
    setValue(next);
    try {
      window.localStorage.setItem(key, String(next));
    } catch {
      /* not persisted this session, but UI still reflects the choice */
    }
  };
  return [value, update] as const;
}

export default function SettingsPage() {
  const { user, setUser } = useUserStore();
  const creditsQuery = useCredits();

  const [fullName, setFullName] = useState(user?.full_name || "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [emailNotifications, setEmailNotifications] = usePreference("paraflow-pref-email-notifications", true);
  const [dnaAutoUpdate, setDnaAutoUpdate] = usePreference("paraflow-pref-dna-autoupdate", true);

  useEffect(() => {
    setFullName(user?.full_name || "");
  }, [user?.full_name]);

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileSaved(false);
    setProfileSaving(true);
    try {
      await api.patch("/v1/users/me", { full_name: fullName.trim() });
      if (user) setUser({ ...user, full_name: fullName.trim() || null });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError(null);
    setPasswordSaved(false);
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await updateUserPassword(newPassword);
      if (error) {
        setPasswordError(error);
      } else {
        setPasswordSaved(true);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSaved(false), 3000);
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <AppShell>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          {/* Account Overview */}
          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/10">
              <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-white text-xl font-semibold shrink-0">
                  {(user?.full_name || user?.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg truncate">{user?.full_name || "Unnamed Writer"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user?.email}</span>
                    {memberSince && (
                      <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Member since {memberSince}</span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      {(creditsQuery.data?.tier || "free").replace(/^\w/, (c) => c.toUpperCase())} plan
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profile */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-primary" />
                  Profile
                </CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input defaultValue={user?.email || ""} icon={<Mail className="w-4 h-4" />} disabled />
                </div>
                {profileError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive">
                    {profileError}
                  </motion.p>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSaveProfile}
                    isLoading={profileSaving}
                    disabled={fullName.trim() === (user?.full_name || "").trim()}
                  >
                    Save Changes
                  </Button>
                  {profileSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm text-success flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Saved
                    </motion.span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Password */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="w-5 h-5 text-primary" />
                  Password
                </CardTitle>
                <CardDescription>You&apos;re signed in, so no need to re-enter your current password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
                {passwordError && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive">
                    {passwordError}
                  </motion.p>
                )}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleUpdatePassword}
                    isLoading={passwordSaving}
                    disabled={!newPassword || !confirmPassword}
                  >
                    Update Password
                  </Button>
                  {passwordSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm text-success flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Password updated
                    </motion.span>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preferences */}
          <motion.div variants={item}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <SlidersHorizontal className="w-5 h-5 text-primary" />
                  Preferences
                </CardTitle>
                <CardDescription>Customize your experience on this device</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="flex items-center justify-between py-3">
                  <div className="pr-4">
                    <p className="font-medium text-sm">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates about your content</p>
                  </div>
                  <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
                </div>
                <div className="h-px bg-border/50" />
                <div className="flex items-center justify-between py-3">
                  <div className="pr-4">
                    <p className="font-medium text-sm">Writing DNA Auto-update</p>
                    <p className="text-xs text-muted-foreground">Automatically improve your profile with each use</p>
                  </div>
                  <Switch checked={dnaAutoUpdate} onCheckedChange={setDnaAutoUpdate} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </AppShell>
  );
}

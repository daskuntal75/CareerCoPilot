import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Smartphone, 
  Monitor, 
  Tablet,
  Trash2,
  Shield,
  ShieldCheck,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { format, formatDistanceToNow } from "date-fns";

interface TrustedDevice {
  fingerprint: string;
  firstSeen: string;
  lastSeen: string;
  deviceName?: string;
}

const TrustedDevicesManagement = () => {
  const { 
    fingerprint: currentFingerprint, 
    deviceInfo,
    isTrusted,
    markAsTrusted, 
    getTrustedDevices, 
    clearTrustedDevices,
    loading 
  } = useDeviceFingerprint();
  
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      refreshDevices();
    }
  }, [loading]);

  const refreshDevices = () => {
    const trustedDevices = getTrustedDevices();
    setDevices(trustedDevices);
  };

  const handleRemoveDevice = (fp: string) => {
    setRemoving(fp);
    try {
      const trusted = localStorage.getItem("trusted_devices");
      if (trusted) {
        const devicesMap: Record<string, TrustedDevice> = JSON.parse(trusted);
        delete devicesMap[fp];
        localStorage.setItem("trusted_devices", JSON.stringify(devicesMap));
        refreshDevices();
        toast.success("Device removed from trusted list");
      }
    } catch (error) {
      console.error("Error removing device:", error);
      toast.error("Failed to remove device");
    } finally {
      setRemoving(null);
    }
  };

  const handleClearAll = () => {
    clearTrustedDevices();
    refreshDevices();
    toast.success("All trusted devices have been removed");
  };

  const handleTrustCurrentDevice = () => {
    markAsTrusted();
    refreshDevices();
    toast.success("This device is now trusted");
  };

  const getDeviceIcon = (deviceName?: string) => {
    if (!deviceName) return Monitor;
    const name = deviceName.toLowerCase();
    if (name.includes("android") || name.includes("ios") || name.includes("iphone")) {
      return Smartphone;
    }
    if (name.includes("ipad") || name.includes("tablet")) {
      return Tablet;
    }
    return Monitor;
  };

  const isCurrentDevice = (fp: string) => fp === currentFingerprint;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Trusted Devices
            </CardTitle>
            <CardDescription>
              Manage devices that are recognized and trusted for login
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refreshDevices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Device Status */}
        <div className={`p-4 rounded-lg border ${
          isTrusted 
            ? "bg-success/5 border-success/30" 
            : "bg-warning/5 border-warning/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isTrusted ? (
                <ShieldCheck className="w-8 h-8 text-success" />
              ) : (
                <AlertTriangle className="w-8 h-8 text-warning" />
              )}
              <div>
                <p className="font-medium">
                  {isTrusted ? "This device is trusted" : "This device is not trusted"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deviceInfo?.components.platform} • {deviceInfo?.components.timezone}
                </p>
              </div>
            </div>
            {!isTrusted && (
              <Button onClick={handleTrustCurrentDevice} size="sm">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Trust This Device
              </Button>
            )}
          </div>
        </div>

        {/* Trusted Devices List */}
        {devices.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                {devices.length} Trusted Device{devices.length !== 1 ? "s" : ""}
              </h4>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove all trusted devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove all devices from your trusted list. You'll need to 
                      re-authenticate any device you want to trust again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Remove All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <AnimatePresence>
              {devices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.deviceName);
                const isCurrent = isCurrentDevice(device.fingerprint);
                
                return (
                  <motion.div
                    key={device.fingerprint}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isCurrent ? "bg-accent/5 border-accent/30" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isCurrent ? "bg-accent/20" : "bg-muted"
                      }`}>
                        <DeviceIcon className={`w-5 h-5 ${
                          isCurrent ? "text-accent" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {device.deviceName || "Unknown Device"}
                          </p>
                          {isCurrent && (
                            <Badge variant="outline" className="text-xs bg-accent/20 text-accent border-accent/30">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Added {formatDistanceToNow(new Date(device.firstSeen), { addSuffix: true })}
                          </span>
                          <span>
                            Last seen {formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDevice(device.fingerprint)}
                        disabled={removing === device.fingerprint}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        {removing === device.fingerprint ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No trusted devices</p>
            <p className="text-sm mt-1">
              Trust this device to skip additional verification in the future
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>What are trusted devices?</strong> When you mark a device as trusted, 
                we'll recognize it for future logins and reduce security verification requirements.
              </p>
              <p>
                You can have up to 5 trusted devices at a time. If you add more, 
                the oldest inactive device will be automatically removed.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrustedDevicesManagement;

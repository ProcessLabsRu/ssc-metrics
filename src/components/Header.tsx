import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, User } from "lucide-react";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";

interface HeaderProps {
  userProfile: {
    full_name: string | null;
    email: string;
  } | null;
  isAdmin: boolean;
  onSignOut: () => void;
}

export const Header = ({ userProfile, isAdmin, onSignOut }: HeaderProps) => {
  const navigate = useNavigate();
  const { settings } = useInterfaceSettings();

  const displayName = userProfile?.full_name || userProfile?.email || "Пользователь";

  return (
    <header 
      className="border-b-2 border-primary/20 shadow-md"
      style={{
        backgroundColor: settings?.header_bg_color || 'hsl(var(--card))',
        color: settings?.header_text_color || 'hsl(var(--foreground))',
      }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {settings?.logo_url ? (
              <img 
                src={settings.logo_url} 
                alt="Logo" 
                className="w-12 h-12 object-contain rounded-lg transition-transform hover:scale-105"
              />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold text-primary">Л</span>
              </div>
            )}
            <h1 className="text-xl font-bold">{settings?.header_title || "SSC Metrics"}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-md"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: settings?.header_text_color || 'hsl(var(--foreground))'
              }}
            >
              <User className="h-4 w-4" style={{ color: 'currentColor' }} />
              <span className="text-sm font-medium">{displayName}</span>
            </div>

            {isAdmin && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/admin")}
                style={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: settings?.header_text_color || 'currentColor',
                  color: settings?.header_text_color || 'currentColor'
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Админ панель
              </Button>
            )}

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSignOut}
              style={{
                color: settings?.header_text_color || 'currentColor'
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выход
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

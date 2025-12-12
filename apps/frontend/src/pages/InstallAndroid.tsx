import { ArrowLeft, MoreVertical, Plus, Home } from "lucide-react";
import { Link } from "react-router-dom";

const InstallAndroid = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link to="/" className="p-2 hover:bg-muted rounded transition-colors">
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </Link>
                    <span className="text-lg font-bold text-foreground tracking-tight">
                        Install on Android
                    </span>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">
                            Add CryptoWire to Your Home Screen
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Get quick access to CryptoWire with an app-like shortcut on your Android device.
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    1
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-foreground mb-1">
                                        Open Chrome
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Make sure you're viewing CryptoWire in Chrome browser for the best experience.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    2
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                                        Tap the menu button
                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Look for the three dots in the top right corner of your screen.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    3
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                                        Select "Add to Home screen"
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Menu wording can vary slightly by device and Chrome version.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    4
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-foreground mb-1">
                                        Confirm installation
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        A popup will appear asking you to confirm. Tap "Add" or "Install" to continue.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    5
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                                        Launch from Home Screen
                                        <Home className="h-4 w-4 text-muted-foreground" />
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        CryptoWire will now appear on your home screen or app drawer. Tap the icon to launch it like a native app!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Alternative Methods</h3>
                        <div className="space-y-3 text-xs text-muted-foreground">
                            <div>
                                <p className="font-semibold text-foreground mb-1">Samsung Internet Browser:</p>
                                <p>Tap the menu (three lines) → "Add page to" → "Home screen"</p>
                            </div>
                            <div>
                                <p className="font-semibold text-foreground mb-1">Firefox:</p>
                                <p>Tap the menu (three dots) → "Install" or "Add to Home screen"</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Why Add to Home Screen?</h3>
                        <ul className="space-y-2 text-xs text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Home screen shortcut for one-tap access</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Instant access with one tap</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Keeps your settings and saved articles on this device</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>Faster performance and native app feel</span>
                            </li>
                        </ul>
                    </div>

                    <Link
                        to="/"
                        className="block w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg text-center font-medium hover:bg-primary/90 transition-colors"
                    >
                        Back to CryptoWire
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default InstallAndroid;

/**
 * Tree-Shaking Optimization Utilities
 * Provides optimized imports and bundle size reduction strategies
 */

// Optimized Lucide React imports
export { 
  Brain,
  Heart, 
  Users, 
  Shield,
  Activity,
  MessageCircle,
  BarChart3,
  Calendar,
  Settings,
  Bell,
  Star,
  ArrowRight,
  Plus,
  Eye,
  Target,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Home,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Sun,
  Moon,
  Cloud,
  Zap,
  Coffee,
  Search,
  Filter,
  Sort,
  Download,
  Upload,
  Share,
  Edit,
  Delete,
  Save,
  Cancel,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  MoreHorizontal,
  Info,
  Warning,
  Error,
  Success
} from 'lucide-react';

// Optimized Radix UI imports
export { 
  Root as DialogRoot,
  Trigger as DialogTrigger,
  Portal as DialogPortal,
  Overlay as DialogOverlay,
  Content as DialogContent,
  Title as DialogTitle,
  Description as DialogDescription,
  Close as DialogClose
} from '@radix-ui/react-dialog';

export {
  Root as DropdownRoot,
  Trigger as DropdownTrigger,
  Portal as DropdownPortal,
  Content as DropdownContent,
  Item as DropdownItem,
  Separator as DropdownSeparator,
  Label as DropdownLabel
} from '@radix-ui/react-dropdown-menu';

export {
  Root as TabsRoot,
  List as TabsList,
  Trigger as TabsTrigger,
  Content as TabsContent
} from '@radix-ui/react-tabs';

export {
  Root as TooltipRoot,
  Trigger as TooltipTrigger,
  Portal as TooltipPortal,
  Content as TooltipContent,
  Provider as TooltipProvider
} from '@radix-ui/react-tooltip';

export {
  Root as AvatarRoot,
  Image as AvatarImage,
  Fallback as AvatarFallback
} from '@radix-ui/react-avatar';

export {
  Root as ProgressRoot,
  Indicator as ProgressIndicator
} from '@radix-ui/react-progress';

export {
  Root as SwitchRoot,
  Thumb as SwitchThumb
} from '@radix-ui/react-switch';

export {
  Root as AlertDialogRoot,
  Trigger as AlertDialogTrigger,
  Portal as AlertDialogPortal,
  Overlay as AlertDialogOverlay,
  Content as AlertDialogContent,
  Title as AlertDialogTitle,
  Description as AlertDialogDescription,
  Action as AlertDialogAction,
  Cancel as AlertDialogCancel
} from '@radix-ui/react-alert-dialog';

// Optimized Date-fns imports (only what's needed)
export { 
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
  addDays,
  subDays,
  differenceInDays,
  parseISO
} from 'date-fns';

// Optimized Chart.js imports
export {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  Filler,
  ArcElement
} from 'chart.js';

export {
  Line as LineChart,
  Bar as BarChart,
  Doughnut as DoughnutChart,
  Pie as PieChart
} from 'react-chartjs-2';

// Framer Motion optimized imports
export {
  motion,
  AnimatePresence,
  useAnimation,
  useSpring,
  useTransform,
  useViewportScroll,
  useMotionValue
} from 'framer-motion';

// Bundle size tracking
export interface BundleInfo {
  component: string;
  estimatedSize: number;
  dependencies: string[];
  treeshakeable: boolean;
}

const bundleTracker = new Map<string, BundleInfo>();

/**
 * Track component bundle information
 */
export function trackBundleUsage(component: string, info: Omit<BundleInfo, 'component'>) {
  bundleTracker.set(component, { component, ...info });
}

/**
 * Get bundle usage statistics
 */
export function getBundleStats() {
  return Array.from(bundleTracker.values());
}

/**
 * Report unused imports (development only)
 */
export function reportUnusedImports() {
  if (process.env.NODE_ENV === 'development') {
    const unused = Array.from(bundleTracker.values())
      .filter(info => !info.treeshakeable)
      .sort((a, b) => b.estimatedSize - a.estimatedSize);
    
    if (unused.length > 0) {
      console.group('🌳 Tree-shaking Opportunities');
      unused.forEach(info => {
        console.log(`${info.component}: ~${(info.estimatedSize / 1024).toFixed(1)}KB could be saved`);
      });
      console.groupEnd();
    }
  }
}

// Initialize tracking
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Track major libraries
  trackBundleUsage('lucide-react', {
    estimatedSize: 350000,
    dependencies: ['react'],
    treeshakeable: true
  });
  
  trackBundleUsage('framer-motion', {
    estimatedSize: 180000,
    dependencies: ['react'],
    treeshakeable: true
  });
  
  trackBundleUsage('radix-ui', {
    estimatedSize: 200000,
    dependencies: ['react', 'react-dom'],
    treeshakeable: true
  });
  
  trackBundleUsage('chart.js', {
    estimatedSize: 250000,
    dependencies: [],
    treeshakeable: true
  });
  
  trackBundleUsage('date-fns', {
    estimatedSize: 150000,
    dependencies: [],
    treeshakeable: true
  });
  
  // Report after page load
  setTimeout(reportUnusedImports, 5000);
}
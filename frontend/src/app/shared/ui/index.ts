/**
 * UI Component Library - Barrel Exports
 *
 * Importar componentes desde aquí:
 * import { AvatarComponent, ChipComponent } from '@shared/ui';
 *
 * Configurar path alias en tsconfig.json:
 * "paths": { "@shared/ui": ["src/app/shared/ui"] }
 */

// ============================================
// ATOMS - Componentes básicos indivisibles
// ============================================
export { AvatarComponent } from './atoms/avatar/avatar.component';
export type { AvatarSize, AvatarStatus } from './atoms/avatar/avatar.component';

export { ButtonComponent } from './atoms/button/button.component';

export { CheckboxComponent } from './atoms/checkbox/checkbox.component';

export { ChipComponent } from './atoms/chip/chip.component';
export type { ChipVariant, ChipSize } from './atoms/chip/chip.component';

export { BadgeComponent } from './atoms/badge/badge.component';
export type { BadgeVariant, BadgeSize, BadgePosition } from './atoms/badge/badge.component';

export { BreadcrumbComponent } from './atoms/breadcrumb/breadcrumb.component';
export type { BreadcrumbItem } from './atoms/breadcrumb/breadcrumb.component';

export { DividerComponent } from './atoms/divider/divider.component';

export { FloatingInputComponent } from './atoms/floating-input/floating-input.component';
export type { FloatingInputType, FloatingInputVariant } from './atoms/floating-input/floating-input.component';

export { FormErrorComponent } from './atoms/form-error/form-error.component';
export { FormRowComponent } from './atoms/form-row/form-row.component';

export {
  IconButtonComponent,
  type IconButtonAnimation,
  type IconButtonSize,
  type IconButtonVariant,
} from './atoms/icon-button/icon-button.component';

export { InputComponent } from './atoms/input/input.component';

export { Input } from './atoms/form-input/input';
export type { InputMode, InputType } from './atoms/form-input/input';

export { LanguageSwitcherComponent } from './atoms/language-switcher/language-switcher.component';
export type { Language } from './atoms/language-switcher/language-switcher.component';

export { LoaderComponent } from './atoms/loader/loader.component';
export type { LoaderVariant, LoaderSize } from './atoms/loader/loader.component';

export { RatingComponent } from './atoms/rating/rating.component';

export { RowComponent } from './atoms/row/row.component';

export { SelectComponent } from './atoms/select/select.component';

export { SkeletonComponent } from './atoms/skeleton/skeleton.component';

export { TextComponent } from './atoms/text/text.component';

export { ToggleComponent } from './atoms/toggle/toggle.component';

export { TextareaComponent } from './atoms/textarea/textarea.component';

export { VersionComponent } from './atoms/version/version.component';
export type { VersionVariant } from './atoms/version/version.component';

export { AppVersionService } from './services/app-version.service';
export type { AppVersionInfo } from './services/app-version.service';
export type { TextareaVariant } from './atoms/textarea/textarea.component';

export { RadioComponent } from './atoms/radio/radio.component';
export type { RadioOption } from './atoms/radio/radio.component';

export { TableComponent } from './atoms/table/table.component';
export type { TableCellOverflow, TableScrollbarMode } from './atoms/table/table.component';
export { TableHeadComponent } from './atoms/table/table-head.component';
export { TableRowComponent } from './atoms/table/table-row.component';
export { TableCellComponent } from './atoms/table/table-cell.component';
export { TableHeaderCellComponent } from './atoms/table/table-header-cell.component';
export type { SortDirection } from './atoms/table/table-header-cell.component';

export { FileInputComponent } from './atoms/file-input/file-input.component';
export type { FileInputFile } from './atoms/file-input/file-input.component';

export { NumberInputComponent } from './atoms/number-input/number-input.component';

export { ProgressComponent } from './atoms/progress/progress.component';
export type { ProgressVariant, ProgressSize } from './atoms/progress/progress.component';

export { SpinnerComponent } from './atoms/spinner/spinner.component';
export type { SpinnerSize, SpinnerVariant } from './atoms/spinner/spinner.component';

export { TooltipDirective } from './atoms/tooltip/tooltip.directive';

// ============================================
// MOLECULES - Combinación de átomos
// ============================================
export { CardComponent } from './molecules/card/card.component';
export type { CardVariant, CardSize } from './molecules/card/card.component';

export { DatepickerComponent } from './molecules/datepicker/datepicker.component';

export { DropdownComponent } from './molecules/dropdown/dropdown.component';
export type { DropdownOption } from './molecules/dropdown/dropdown.component';

export { ModalComponent } from './molecules/modal/modal.component';

export { PaginationComponent } from './molecules/pagination/pagination.component';

export { Select2Component } from './molecules/select2/select2.component';
export type { Select2Option } from './molecules/select2/select2.component';

export { TableActionsComponent } from './molecules/table-actions/table-actions.component';

export { ActionGroupComponent } from './molecules/action-group/action-group.component';
export type { ActionItem } from './molecules/action-group/action-group.component';

export { ContextMenuComponent } from './molecules/context-menu/context-menu.component';
export type {
  ContextMenuAction,
  ContextMenuActionError,
  ContextMenuFailureReason,
} from './molecules/context-menu/context-menu.component';

export { ToastComponent } from './molecules/toast/toast.component';
export type { ToastConfig, ToastType } from './molecules/toast/toast.component';
export { ToastService } from './services/toast.service';
export type { ToastItem } from './services/toast.service';

export { KpiCardComponent } from './molecules/kpi-card/kpi-card.component';
export type { KpiTrend, KpiFormat } from './molecules/kpi-card/kpi-card.component';

export { PopupContainerComponent } from './molecules/popup/popup-container.component';
export { PopupService } from './services/popup.service';
export type { PopupConfig, PopupItem, PopupButton, PopupSize, PopupType } from './services/popup.service';

export { ModalContainerComponent } from './molecules/modal/modal-container.component';
export { ModalService } from './services/modal.service';
export type { ModalConfig, ModalItem, ModalButton, ModalSize } from './services/modal.service';

export { UserMenuComponent } from './molecules/user-menu/user-menu.component';

export { AlertComponent } from './molecules/alert/alert.component';
export type { AlertVariant, AlertSize } from './molecules/alert/alert.component';

export { TagInputComponent } from './molecules/tag-input/tag-input.component';
export type { TagInputOption } from './molecules/tag-input/tag-input.component';

export { ComboboxComponent } from './molecules/combobox/combobox.component';
export type { ComboboxOption } from './molecules/combobox/combobox.component';

export { TimelineComponent } from './molecules/timeline/timeline.component';
export type { TimelineItem, TimelineItemStatus } from './molecules/timeline/timeline.component';

export { AvatarGroupComponent } from './molecules/avatar-group/avatar-group.component';
export type { AvatarGroupItem } from './molecules/avatar-group/avatar-group.component';

// ============================================
// ORGANISMS - Estructuras complejas
// ============================================
export { AccordionComponent, AccordionItemComponent } from './organisms/accordion/accordion.component';

export { DataPagerComponent } from './organisms/data-pager/data-pager.component';

export { FiltersComponent } from './organisms/filters/filters.component';

export { FooterComponent } from './organisms/footer/footer.component';
export type { SocialLink, LegalLink, FooterVariant } from './organisms/footer/footer.component';

export { ScrollOverlayComponent } from './organisms/scroll-overlay/scroll-overlay.component';

export { SidebarComponent } from './organisms/sidebar/sidebar.component';
export type { SidebarUser, SidebarMenuItem } from './organisms/sidebar/sidebar.component';

export { StepperComponent } from './organisms/stepper/stepper.component';
export type { Step } from './organisms/stepper/stepper.component';

export { TabsComponent, TabComponent } from './organisms/tabs/tabs.component';

export { ChartComponent } from './organisms/chart/chart.component';

export { ThemeSwitcherComponent } from './organisms/theme-switcher/theme-switcher.component';

export { TopbarComponent } from './organisms/topbar/topbar.component';

export { NavBarComponent } from './organisms/navbar/navbar.component';
export type { NavBarItem, NavBarBrand } from './organisms/navbar/navbar.component';

export { MetricsGridComponent } from './organisms/metrics-grid/metrics-grid.component';
export type { KpiMetric } from './organisms/metrics-grid/metrics-grid.component';

// ============================================
// SURFACES
// ============================================
export { PanelComponent } from './surfaces/panel/panel.component';

// ============================================
// TEMPLATES
// ============================================
export { LayoutShellComponent } from './templates/layout-shell/layout-shell.component';

export { AuthLayoutComponent } from './templates/auth-layout/auth-layout.component';

// ============================================
// SERVICES
// ============================================
export { ThemeService } from './services/theme.service';

export { GlobalErrorHandlerService } from './services/error-handler.service';

export { cacheInterceptor, invalidateCache } from './interceptors/cache.interceptor';

export { PermissionDirective } from './directives/permission.directive';

export { FormBuilderHelper } from './helpers/form-builder.helper';

export { ValidationService, DEFAULT_VALIDATION_MESSAGES } from './services/validation.service';
export type { ValidationMessage } from './services/validation.service';

export { ApiService } from './services/api.service';
export type { ApiRequestOptions, ApiResponse, ApiError } from './services/api.service';

export { useApi, UseApiService } from './services/use-api.service';
export type { ApiState, UseApiResult } from './services/use-api.service';

// ============================================
// DATA MANAGEMENT
// ============================================
export { DataStateComponent } from './molecules/data-state/data-state.component';

// ============================================
// AUTHENTICATION - Services, Guards, Interceptors
// ============================================
export { TokenService } from './services/token.service';
export type { TokenConfig, JwtPayload } from './services/token.service';

export { AuthService } from './services/auth.service';
export type {
    UserProfile,
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest
} from './services/auth.service';

export { authGuard, guestGuard, passwordChangeGuard } from './guards/auth.guard';

export { authInterceptor } from './interceptors/auth.interceptor';
export * from './organisms/chart/chart.component';
export { AboutDialogComponent } from './organisms/about-dialog/about-dialog.component';
export type {
    AboutDialogVariant,
    AboutCreditItem,
    AboutTechBadge,
    AboutLinkItem
} from './organisms/about-dialog/about-dialog.component';

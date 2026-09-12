/**
 * Modul Customers — kepemilikan kode domain customers.
 * Manifest (menu/rbac/widgets/detail_tabs) TETAP di backend: modules/Customer/manifest.php,
 * dibaca lewat useModuleExtensions — jangan diduplikasi di frontend.
 */
export { default as CustomersPage } from "./components/customers-page";
export { PengawasTab } from "./components/pengawas-tab";

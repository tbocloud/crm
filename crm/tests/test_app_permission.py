from unittest.mock import patch

import frappe

from crm.api import check_app_permission
from crm.tests import CRMTestCase

USER = "app.permission@crm.test"


def admit_everyone():
	"""A crm_app_permission hook as another app (tbo_smart) registers it."""
	return True


class TestAppPermission(CRMTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		if not frappe.db.exists("User", USER):
			frappe.get_doc(
				{"doctype": "User", "email": USER, "first_name": "Finance", "send_welcome_email": 0}
			).insert(ignore_permissions=True)
		frappe.get_doc("User", USER).add_roles("System Manager")

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_hook_admits_a_user_without_sales_roles(self):
		modules = [{"module_name": "FCRM"}]
		user = frappe.get_doc("User", USER)
		user.remove_roles("System Manager")
		frappe.set_user(USER)
		# take the v15 module lookup on any Frappe version, with FCRM allowed
		with (
			patch("crm.api.is_frappe_version", side_effect=lambda version, **kwargs: version == "15"),
			patch("frappe.config.get_modules_from_all_apps_for_user", create=True, return_value=modules),
		):
			self.assertFalse(check_app_permission())
			get_hooks = frappe.get_hooks

			def hooks(hook=None, *args, **kwargs):
				if hook == "crm_app_permission":
					return ["crm.tests.test_app_permission.admit_everyone"]
				return get_hooks(hook, *args, **kwargs)

			with patch("frappe.get_hooks", side_effect=hooks):
				self.assertTrue(check_app_permission())

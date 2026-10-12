from unittest.mock import patch

import frappe

from crm.api.dashboard import get_chart, get_dashboard, place_provider_items
from crm.tests import CRMTestCase

HOOKS = {
	"crm_dashboard_providers": ["crm.tests.test_dashboard_providers"],
	"crm_dashboard_layout": ["crm.tests.test_dashboard_providers.provider_cards"],
}


def get_provider_test_card(from_date, to_date, user):
	"""A chart another app provides (tbo_smart registers its module the same way)."""
	return {"title": "Provider card", "value": 7}


def provider_cards(from_date, to_date, user):
	return [
		{
			"name": "provider_test_card",
			"type": "number_chart",
			"data": get_provider_test_card(from_date, to_date, user),
		}
	]


def patched_hooks():
	get_hooks = frappe.get_hooks

	def hooks(hook=None, *args, **kwargs):
		if hook in HOOKS:
			return HOOKS[hook]
		return get_hooks(hook, *args, **kwargs)

	return patch("frappe.get_hooks", side_effect=hooks)


class TestDashboardProviders(CRMTestCase):
	def test_provider_charts_and_cards(self):
		frappe.set_user("Administrator")
		with patched_hooks():
			self.assertEqual(get_chart("provider_test_card", "number_chart")["value"], 7)
			layout = get_dashboard()
		card = next(item for item in layout if item["name"] == "provider_test_card")
		self.assertTrue(card["provider"])
		self.assertEqual(card["data"]["value"], 7)
		others = [item for item in layout if not item.get("provider")]
		bottom = max(item["layout"]["y"] + item["layout"]["h"] for item in others)
		self.assertGreaterEqual(card["layout"]["y"], bottom)

	def test_saved_provider_cards_are_not_repeated(self):
		frappe.set_user("Administrator")
		with patched_hooks():
			layout = get_dashboard()
			saved = [{key: value for key, value in item.items() if key != "data"} for item in layout]
			frappe.db.set_value("CRM Dashboard", "Manager Dashboard", "layout", frappe.as_json(saved))
			again = get_dashboard()
		self.assertEqual(len([item for item in again if item["name"] == "provider_test_card"]), 1)
		frappe.db.rollback()

	def test_wrapped_cards_go_below_the_tallest_of_the_row(self):
		items = place_provider_items(
			[], [{"name": "tall", "w": 16, "h": 6}, {"name": "wide", "w": 5, "h": 2}]
		)
		self.assertEqual([item["layout"]["y"] for item in items], [0, 6])

	def test_other_users_need_the_app_gate(self):
		frappe.set_user("Guest")
		self.addCleanup(frappe.set_user, "Administrator")
		with patch("crm.api.dashboard.check_app_permission", return_value=False):
			with self.assertRaises(frappe.PermissionError):
				get_dashboard()

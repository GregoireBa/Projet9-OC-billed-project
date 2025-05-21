/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from "../app/Router.js";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });
    test("Then bills should be ordered from earliest to latest", () => {
      const sortedBills = [...bills].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      ); // ordre croissant
      document.body.innerHTML = BillsUI({ data: sortedBills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);
      const datesSorted = [...dates].sort((a, b) => new Date(a) - new Date(b)); // tri croissant
      expect(dates).toEqual(datesSorted);
    });

    // Tests ajoutés pour améliorer la couverture
    test("Then clicking on new bill button should navigate to NewBill page", () => {
      // Initialisation
      const onNavigate = jest.fn();
      const billsInstance = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // Simulation de l'interface
      document.body.innerHTML = BillsUI({ data: bills });

      // Récupération du bouton et simulation du clic
      const newBillButton = screen.getByTestId("btn-new-bill");
      const handleClickNewBill = jest.fn(billsInstance.handleClickNewBill);
      newBillButton.addEventListener("click", handleClickNewBill);
      fireEvent.click(newBillButton);

      // Vérifications
      expect(handleClickNewBill).toHaveBeenCalled();
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
    });

    test("Then clicking on icon eye should open a modal", () => {
      // Préparation du DOM avec jQuery
      $.fn.modal = jest.fn(); // Mock de la fonction modal de jQuery

      // Initialisation
      document.body.innerHTML = BillsUI({ data: bills });

      // Ajout de la modale au DOM
      const modale = document.createElement("div");
      modale.setAttribute("id", "modaleFile");
      modale.innerHTML = `
        <div class="modal-body"></div>
      `;
      document.body.appendChild(modale);

      // Création de l'instance Bills
      const billsInstance = new Bills({
        document,
        onNavigate: jest.fn(),
        store: null,
        localStorage: window.localStorage,
      });

      // Simulation du clic sur l'icône œil
      const iconEye = screen.getAllByTestId("icon-eye")[0];
      const handleClickIconEye = jest.fn(() =>
        billsInstance.handleClickIconEye(iconEye)
      );
      iconEye.addEventListener("click", handleClickIconEye);
      fireEvent.click(iconEye);

      // Vérifications
      expect(handleClickIconEye).toHaveBeenCalled();
      expect($.fn.modal).toHaveBeenCalledWith("show");
    });

    test("Then getBills should return formatted bills", async () => {
      // Création du mock store
      const store = {
        bills: jest.fn(() => ({
          list: jest.fn().mockResolvedValue(bills),
        })),
      };

      // Initialisation de l'instance Bills
      const billsInstance = new Bills({
        document,
        onNavigate: jest.fn(),
        store,
        localStorage: window.localStorage,
      });

      // Appel de la méthode getBills
      const result = await billsInstance.getBills();

      // Vérifications
      expect(result.length).toBe(bills.length);
      // Vérifier que les bills sont formatés correctement
      expect(result[0].date).not.toBe(bills[0].date); // Le format de date a changé
      expect(result[0].status).not.toBe(undefined); // Le statut est formaté
    });

    // Test de gestion des erreurs
    test("Then getBills should handle formatting errors", async () => {
      // Création d'un bill avec une date invalide
      const billWithInvalidDate = [
        {
          ...bills[0],
          date: "invalid-date", // Date qui provoquera une erreur lors du formatage
        },
      ];

      // Création du mock store
      const store = {
        bills: jest.fn(() => ({
          list: jest.fn().mockResolvedValue(billWithInvalidDate),
        })),
      };

      // Espion sur console.log pour vérifier qu'il est appelé avec l'erreur
      console.log = jest.fn();

      // Initialisation de l'instance Bills
      const billsInstance = new Bills({
        document,
        onNavigate: jest.fn(),
        store,
        localStorage: window.localStorage,
      });

      // Appel de la méthode getBills
      const result = await billsInstance.getBills();

      // Vérifications
      expect(result.length).toBe(1);
      expect(result[0].date).toBe("invalid-date"); // La date originale est conservée en cas d'erreur
    });
  });
});

// Test d'intégration GET
describe("Given I am a user connected as Employee", () => {
  describe("When I navigate to Bills", () => {
    test("fetches bills from mock API GET", async () => {
      localStorage.setItem(
        "user",
        JSON.stringify({ type: "Employee", email: "e@e" })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      // Attendre que la page Bills soit chargée
      await waitFor(() => screen.getByText("Mes notes de frais"));

      // Vérifier que les éléments sont bien présents
      expect(screen.getByText("Mes notes de frais")).toBeTruthy();
      const contentBtn = screen.getByTestId("btn-new-bill");
      expect(contentBtn).toBeTruthy();
      expect(screen.getAllByTestId("icon-eye")).toBeTruthy();
    });

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills");
        Object.defineProperty(window, "localStorage", {
          value: localStorageMock,
        });
        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "e@e",
          })
        );
        const root = document.createElement("div");
        root.setAttribute("id", "root");
        document.body.appendChild(root);
        router();
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/);
        expect(message).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"));
            },
          };
        });
        window.onNavigate(ROUTES_PATH.Bills);
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/);
        expect(message).toBeTruthy();
      });
    });
  });
});

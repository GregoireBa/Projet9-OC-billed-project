/**
 * @jest-environment jsdom
 */

import { screen } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { fireEvent, waitFor } from "@testing-library/dom";

jest.mock("../app/store", () => mockStore);

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    test("Then the form should be displayed", () => {
      // Préparation de l'environnement
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );

      // Affichage de la page NewBill
      const html = NewBillUI();
      document.body.innerHTML = html;

      // Vérification que le formulaire est affiché
      const form = screen.getByTestId("form-new-bill");
      expect(form).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
      expect(screen.getByTestId("datepicker")).toBeTruthy();
      expect(screen.getByTestId("amount")).toBeTruthy();
      expect(screen.getByTestId("vat")).toBeTruthy();
      expect(screen.getByTestId("pct")).toBeTruthy();
      expect(screen.getByTestId("commentary")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
      expect(screen.getByRole("button")).toBeTruthy();
    });

    // Test de la validation des extensions de fichiers
    test("Then I should be alerted when selecting a file with invalid extension", () => {
      // Préparation de l'environnement
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }));
      document.body.innerHTML = NewBillUI();

      // Mock de la fonction alert pour vérifier qu'elle est appelée
      global.alert = jest.fn();

      // Création d'une instance de NewBill
      const newBillInstance = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Simulation directe de handleChangeFile avec un fichier PDF (extension invalide)
      const invalidEvent = {
        preventDefault: jest.fn(),
        target: {
          value: "C:\\fakepath\\document.pdf",
          files: [
            new File(["file content"], "document.pdf", {
              type: "application/pdf",
            }),
          ],
        },
      };

      // Application directe de la méthode handleChangeFile
      newBillInstance.handleChangeFile(invalidEvent);

      // Vérification que l'alerte a été affichée
      expect(global.alert).toHaveBeenCalledWith(
        "Seuls les fichiers jpg, jpeg et png sont acceptés"
      );
    });

    // Test de la soumission d'un formulaire valide
    test("Then I can submit a new bill with valid data", () => {
      // Préparation de l'environnement
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );
      document.body.innerHTML = NewBillUI();

      // Création d'une instance de NewBill avec onNavigate mockée
      const onNavigate = jest.fn();
      const newBillInstance = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Ajout de données nécessaires pour la soumission
      newBillInstance.fileUrl = "http://example.com/image.jpg";
      newBillInstance.fileName = "image.jpg";

      // Mock de la méthode updateBill pour éviter l'appel API
      newBillInstance.updateBill = jest.fn();

      // Simulation de la soumission du formulaire
      const form = screen.getByTestId("form-new-bill");
      const handleSubmit = jest.fn(newBillInstance.handleSubmit);
      form.addEventListener("submit", handleSubmit);

      fireEvent.submit(form);

      // Vérification que handleSubmit a été appelé
      expect(handleSubmit).toHaveBeenCalled();
      // Vérification que updateBill a été appelé
      expect(newBillInstance.updateBill).toHaveBeenCalled();
      // Vérification de la navigation vers Bills
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });

    // Test de la gestion de l'upload de fichier
    test("Then I can upload an image file with valid extension", () => {
      // Préparation de l'environnement
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );
      document.body.innerHTML = NewBillUI();

      // Mock du store
      const storeMock = {
        bills: jest.fn().mockReturnValue({
          create: jest.fn().mockResolvedValue({
            fileUrl: "http://example.com/image.jpg",
            key: "1234",
          }),
        }),
      };

      // Création d'une instance de NewBill
      const newBillInstance = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: window.localStorage,
      });

      // Simulation directe de handleChangeFile avec un fichier JPG (extension valide)
      const validEvent = {
        preventDefault: jest.fn(),
        target: {
          value: "C:\\fakepath\\image.jpg",
          files: [
            new File(["file content"], "image.jpg", { type: "image/jpeg" }),
          ],
        },
      };

      // Application directe de la méthode handleChangeFile
      newBillInstance.handleChangeFile(validEvent);

      // Vérification que create a été appelé sur le store
      expect(storeMock.bills().create).toHaveBeenCalled();
    });

    // Test de la valeur par défaut pour pct
    test("Then form submission should use default pct value if not provided", () => {
      // Préparation de l'environnement
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
          email: "employee@test.com",
        })
      );
      document.body.innerHTML = NewBillUI();

      // Création d'une instance de NewBill
      const newBillInstance = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: window.localStorage,
      });

      // Préparation des propriétés pour la facture
      newBillInstance.fileUrl = "http://example.com/image.jpg";
      newBillInstance.fileName = "image.jpg";

      // Mock de updateBill
      newBillInstance.updateBill = jest.fn();

      // Simuler un événement de soumission sans valeur pct
      const event = {
        preventDefault: jest.fn(),
        target: {
          querySelector: (selector) => {
            if (selector.includes("expense-type"))
              return { value: "Transport" };
            if (selector.includes("expense-name")) return { value: "Test" };
            if (selector.includes("datepicker")) return { value: "2023-01-01" };
            if (selector.includes("amount")) return { value: "100" };
            if (selector.includes("vat")) return { value: "20" };
            if (selector.includes("pct")) return { value: "" }; // Pas de valeur pct
            if (selector.includes("commentary"))
              return { value: "Test comment" };
            return null;
          },
        },
      };

      // Appeler handleSubmit directement
      newBillInstance.handleSubmit(event);

      // Vérifier que updateBill a été appelé avec pct = 20 (valeur par défaut)
      expect(newBillInstance.updateBill).toHaveBeenCalledWith(
        expect.objectContaining({ pct: 20 })
      );
    });
  });
});

// Test d'intégration POST pour la création d'une nouvelle facture
describe("Given I am connected as Employee and I submit a new bill", () => {
  test("Then the bill should be created and I should be redirected to Bills page", async () => {
    // Mock localStorage
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "employee@test.com",
      })
    );

    // Création d'une instance de NewBill
    const html = NewBillUI();
    document.body.innerHTML = html;

    // Spy sur console.log et console.error
    console.log = jest.fn();
    console.error = jest.fn();

    // Mock du store pour simuler une création réussie
    const mockedStoreFunctions = {
      bills: jest.fn().mockReturnValue({
        create: jest.fn().mockResolvedValue({ fileUrl: "url", key: "1234" }),
        update: jest.fn().mockResolvedValue({}),
      }),
    };

    // Création de l'instance NewBill
    const onNavigate = jest.fn();
    const newBill = new NewBill({
      document,
      onNavigate,
      store: mockedStoreFunctions,
      localStorage: window.localStorage,
    });

    // Simuler l'upload de fichier (appel direct pour éviter l'erreur JSDOM)
    const validFileEvent = {
      preventDefault: jest.fn(),
      target: {
        value: "C:\\fakepath\\image.jpg",
        files: [new File(["content"], "image.jpg", { type: "image/jpeg" })],
      },
    };

    // Appeler handleChangeFile et attendre la résolution de la promesse
    await newBill.handleChangeFile(validFileEvent);

    // Vérifier que la facture est bien initialisée
    expect(newBill.billId).toBe("1234");
    expect(newBill.fileUrl).toBe("url");
    expect(newBill.fileName).toBe("image.jpg");

    // Simuler la soumission du formulaire
    const submitEvent = {
      preventDefault: jest.fn(),
      target: {
        querySelector: (selector) => {
          if (selector.includes("expense-type")) return { value: "Transport" };
          if (selector.includes("expense-name"))
            return { value: "Test integration" };
          if (selector.includes("datepicker")) return { value: "2023-01-01" };
          if (selector.includes("amount")) return { value: "100" };
          if (selector.includes("vat")) return { value: "20" };
          if (selector.includes("pct")) return { value: "10" };
          if (selector.includes("commentary")) return { value: "Test comment" };
          return null;
        },
      },
    };

    // Appeler handleSubmit
    newBill.handleSubmit(submitEvent);

    // Vérifier la redirection vers la page Bills
    expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
  });

  // Test d'erreur API
  test("Then API errors during file upload should be caught", async () => {
    // Mock localStorage
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
    window.localStorage.setItem(
      "user",
      JSON.stringify({
        type: "Employee",
        email: "employee@test.com",
      })
    );

    document.body.innerHTML = NewBillUI();

    // Spy sur console.error
    console.error = jest.fn();

    // Mock du store pour simuler une erreur
    const errorMessage = "Erreur API";
    const mockedStoreFunctions = {
      bills: jest.fn().mockReturnValue({
        create: jest.fn().mockRejectedValue(new Error(errorMessage)),
      }),
    };

    // Création de l'instance NewBill
    const newBill = new NewBill({
      document,
      onNavigate: jest.fn(),
      store: mockedStoreFunctions,
      localStorage: window.localStorage,
    });

    // Simuler l'upload de fichier avec un événement valide
    const validFileEvent = {
      preventDefault: jest.fn(),
      target: {
        value: "C:\\fakepath\\image.jpg",
        files: [new File(["content"], "image.jpg", { type: "image/jpeg" })],
      },
    };

    // Appeler handleChangeFile
    newBill.handleChangeFile(validFileEvent);
    await new Promise(process.nextTick);

    // Vérifier que l'erreur a été loggée
    expect(console.error).toHaveBeenCalledWith(new Error(errorMessage));
  });
});

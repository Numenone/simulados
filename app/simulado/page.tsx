import SetupScreen from "@/components/SetupScreen";

export default function Page() {
  return (
    <SetupScreen
      mode="simulado"
      title="Simulado"
      intro="Prova fechada, sem gabarito durante a execução, na proporção por matéria do novo formato de fase única. No fim você vê o resultado e revisa questão a questão."
    />
  );
}

import { AssistantNav } from "./assistant-nav";

export default function AssistantLayout({ children }: LayoutProps<"/assistant">) {
  return <AssistantNav>{children}</AssistantNav>;
}

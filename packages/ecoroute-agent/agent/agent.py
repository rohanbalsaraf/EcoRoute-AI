# ================================================================
# ecoroute-agent/agent/agent.py
#
# EcoRoute AI Assistant — ReAct Agent
# ================================================================

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.agents import create_react_agent, AgentExecutor
from langchain import hub
from .tools import find_greenest_route, compare_vehicle_emissions, get_eco_tips

load_dotenv()

class EcoRouteAssistant:
    def __init__(self, model: str = "gpt-4-turbo-preview"):
        self.llm = ChatOpenAI(temperature=0, model=model)
        self.tools = [
            find_greenest_route,
            compare_vehicle_emissions,
            get_eco_tips
        ]
        
        # Get the standard ReAct prompt
        prompt = hub.pull("hwchase17/react")
        
        # Create the modern ReAct agent
        agent = create_react_agent(self.llm, self.tools, prompt)
        
        # Create the executor
        self.agent_executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True
        )

    async def chat(self, message: str, chat_history: list = []):
        """
        Main entry point for the AI assistant.
        """
        response = await self.agent_executor.ainvoke({
            "input": message,
            "chat_history": chat_history
        })
        return response["output"]

if __name__ == "__main__":
    import asyncio
    
    async def test():
        assistant = EcoRouteAssistant()
        print("EcoRoute Assistant ready. Type 'exit' to quit.")
        while True:
            user_input = input("You: ")
            if user_input.lower() == "exit":
                break
            response = await assistant.chat(user_input)
            print(f"Assistant: {response}")

    asyncio.run(test())

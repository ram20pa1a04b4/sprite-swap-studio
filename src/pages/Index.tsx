
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import BlocksList from '@/components/BlocksList';
import SpriteEditor from '@/components/SpriteEditor';
import CodeWorkspace from '@/components/CodeWorkspace';
import Canvas from '@/components/Canvas';
import { Sprite } from '@/types/sprite';
import { Block } from '@/types/block';
import { Play, Pause, RotateCcw } from 'lucide-react';

const Index = () => {
  // App state
  const [sprites, setSprites] = useState<Sprite[]>([]);
  const [selectedSpriteId, setSelectedSpriteId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Store the state of each sprite (position, direction, etc.)
  const [spriteStates, setSpriteStates] = useState<Record<string, {
    x: number;
    y: number;
    direction: number;
    sayText: string | null;
    thinkText: string | null;
    textTimer: number | null;
    isThinking: boolean;
  }>>({});
  
  // References to store the original scripts before animation starts
  const originalScriptsRef = useRef<Record<string, Block[]>>({});
  
  // Animation interval reference
  const animationIntervalRef = useRef<number | null>(null);
  
  // Initialize with a default sprite
  useEffect(() => {
    if (sprites.length === 0) {
      handleAddSprite({
        id: `sprite-${Date.now()}`,
        name: 'Sprite 1',
        color: '#4C97FF',
        width: 50,
        height: 50,
        shape: 'square',
        scripts: []
      });
    }
  }, []);
  
  // Initialize sprite states when sprites change
  useEffect(() => {
    const newSpriteStates = { ...spriteStates };
    
    sprites.forEach(sprite => {
      if (!newSpriteStates[sprite.id]) {
        newSpriteStates[sprite.id] = {
          x: 0,
          y: 0,
          direction: 90, // 90 degrees is pointing up
          sayText: null,
          thinkText: null,
          textTimer: null,
          isThinking: false
        };
      }
    });
    
    // Remove states for deleted sprites
    Object.keys(newSpriteStates).forEach(id => {
      if (!sprites.find(s => s.id === id)) {
        delete newSpriteStates[id];
      }
    });
    
    setSpriteStates(newSpriteStates);
  }, [sprites]);
  
  // Handle adding a new sprite
  const handleAddSprite = (sprite: Sprite) => {
    setSprites(prev => [...prev, sprite]);
    setSelectedSpriteId(sprite.id);
  };
  
  // Handle updating a sprite
  const handleUpdateSprite = (updatedSprite: Sprite) => {
    setSprites(prev => 
      prev.map(sprite => 
        sprite.id === updatedSprite.id ? updatedSprite : sprite
      )
    );
  };
  
  // Handle deleting a sprite
  const handleDeleteSprite = (id: string) => {
    setSprites(prev => prev.filter(sprite => sprite.id !== id));
    
    if (selectedSpriteId === id) {
      setSelectedSpriteId(null);
    }
  };
  
  // Handle block drag start
  const handleBlockDragStart = (e: React.DragEvent, id: string, type: string, category: string) => {
    // This is handled by the DraggableBlock component
  };
  
  // Execute scripts for a specific sprite
  const executeScriptsForSprite = (spriteId: string, scripts: Block[], loopIndices: Record<string, number> = {}) => {
    const sprite = sprites.find(s => s.id === spriteId);
    if (!sprite) return;
    
    const state = { ...spriteStates[spriteId] };
    
    scripts.forEach(block => {
      switch (block.type) {
        case 'move':
          // Calculate movement based on current direction
          const radians = (state.direction - 90) * Math.PI / 180; // Adjust for canvas coordinates
          state.x += block.params.steps * Math.cos(radians);
          state.y += block.params.steps * Math.sin(radians);
          break;
        
        case 'turn':
          state.direction = (state.direction + block.params.degrees) % 360;
          if (state.direction < 0) state.direction += 360;
          break;
        
        case 'goto':
          state.x = block.params.x;
          state.y = block.params.y;
          break;
        
        case 'say':
          state.sayText = block.params.text;
          state.thinkText = null;
          state.textTimer = block.params.seconds;
          state.isThinking = false;
          break;
        
        case 'think':
          state.thinkText = block.params.text;
          state.sayText = null;
          state.textTimer = block.params.seconds;
          state.isThinking = true;
          break;
        
        case 'repeat':
          // Initialize loop counter if not already set
          if (loopIndices[block.id] === undefined) {
            loopIndices[block.id] = 0;
          }
          
          // Execute the repeat block's children if we haven't reached the limit
          if (loopIndices[block.id] < block.params.times && block.children) {
            executeScriptsForSprite(spriteId, block.children, loopIndices);
            loopIndices[block.id]++;
          }
          break;
      }
    });
    
    // Update the sprite state
    setSpriteStates(prev => ({
      ...prev,
      [spriteId]: state
    }));
  };
  
  // Start the animation
  const startAnimation = () => {
    // Store original scripts
    const originalScripts: Record<string, Block[]> = {};
    sprites.forEach(sprite => {
      originalScripts[sprite.id] = [...sprite.scripts];
    });
    originalScriptsRef.current = originalScripts;
    
    // Reset sprite positions
    const resetStates: Record<string, any> = {};
    sprites.forEach(sprite => {
      resetStates[sprite.id] = {
        x: 0,
        y: 0,
        direction: 90,
        sayText: null,
        thinkText: null,
        textTimer: null,
        isThinking: false
      };
    });
    setSpriteStates(resetStates);
    
    setIsPlaying(true);
    
    // Set up an interval to execute scripts
    const loopIndices: Record<string, Record<string, number>> = {};
    sprites.forEach(sprite => {
      loopIndices[sprite.id] = {};
    });
    
    animationIntervalRef.current = window.setInterval(() => {
      sprites.forEach(sprite => {
        executeScriptsForSprite(sprite.id, sprite.scripts, loopIndices[sprite.id]);
      });
    }, 100);
  };
  
  // Stop the animation
  const stopAnimation = () => {
    if (animationIntervalRef.current !== null) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    
    setIsPlaying(false);
  };
  
  // Reset the animation
  const resetAnimation = () => {
    stopAnimation();
    
    // Reset sprite positions
    const resetStates: Record<string, any> = {};
    sprites.forEach(sprite => {
      resetStates[sprite.id] = {
        x: 0,
        y: 0,
        direction: 90,
        sayText: null,
        thinkText: null,
        textTimer: null,
        isThinking: false
      };
    });
    setSpriteStates(resetStates);
  };
  
  // Handle collision between sprites (swap their motion scripts)
  const handleCollision = (spriteId1: string, spriteId2: string) => {
    if (!isPlaying) return;
    
    const sprite1 = sprites.find(s => s.id === spriteId1);
    const sprite2 = sprites.find(s => s.id === spriteId2);
    
    if (!sprite1 || !sprite2) return;
    
    // Get the original scripts (before any swap)
    const originalScripts1 = originalScriptsRef.current[spriteId1] || [];
    const originalScripts2 = originalScriptsRef.current[spriteId2] || [];
    
    // Filter for motion blocks
    const getMotionBlocks = (scripts: Block[]): Block[] => {
      return scripts.filter(block => block.category === 'motion');
    };
    
    const getNonMotionBlocks = (scripts: Block[]): Block[] => {
      return scripts.filter(block => block.category !== 'motion');
    };
    
    // Get motion and non-motion blocks
    const sprite1MotionBlocks = getMotionBlocks(originalScripts1);
    const sprite2MotionBlocks = getMotionBlocks(originalScripts2);
    const sprite1NonMotionBlocks = getNonMotionBlocks(originalScripts1);
    const sprite2NonMotionBlocks = getNonMotionBlocks(originalScripts2);
    
    // Check if both sprites have motion blocks
    if (sprite1MotionBlocks.length === 0 || sprite2MotionBlocks.length === 0) {
      return;
    }
    
    // Create new sprites with swapped motion blocks
    const updatedSprite1 = {
      ...sprite1,
      scripts: [...sprite2MotionBlocks, ...sprite1NonMotionBlocks]
    };
    
    const updatedSprite2 = {
      ...sprite2,
      scripts: [...sprite1MotionBlocks, ...sprite2NonMotionBlocks]
    };
    
    // Update sprites
    setSprites(prev => prev.map(s => {
      if (s.id === spriteId1) return updatedSprite1;
      if (s.id === spriteId2) return updatedSprite2;
      return s;
    }));
    
    // Show a toast notification
    toast(`${sprite1.name} and ${sprite2.name} collided! Motion blocks swapped.`, {
      duration: 3000
    });
  };
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current !== null) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header with title */}
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Sprite Swap Studio</h1>
          
          <div className="flex space-x-2">
            <Button
              onClick={isPlaying ? stopAnimation : startAnimation}
              variant={isPlaying ? "outline" : "default"}
              className="flex items-center"
            >
              {isPlaying ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Play
                </>
              )}
            </Button>
            
            <Button
              onClick={resetAnimation}
              variant="outline"
              className="flex items-center"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content area */}
      <main className="flex-1 container mx-auto p-4 grid grid-cols-12 gap-4">
        {/* Left sidebar with blocks palette */}
        <div className="col-span-3 bg-white rounded-lg shadow overflow-hidden">
          <Tabs defaultValue="motion">
            <TabsList className="w-full">
              <TabsTrigger value="motion" className="flex-1 bg-motion/10">Motion</TabsTrigger>
              <TabsTrigger value="looks" className="flex-1 bg-looks/10">Looks</TabsTrigger>
              <TabsTrigger value="control" className="flex-1 bg-control/10">Control</TabsTrigger>
            </TabsList>
            
            <TabsContent value="motion" className="p-4">
              <BlocksList 
                category="motion" 
                onDragStart={handleBlockDragStart} 
              />
            </TabsContent>
            
            <TabsContent value="looks" className="p-4">
              <BlocksList 
                category="looks" 
                onDragStart={handleBlockDragStart} 
              />
            </TabsContent>
            
            <TabsContent value="control" className="p-4">
              <BlocksList 
                category="control" 
                onDragStart={handleBlockDragStart} 
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Center area with code workspace */}
        <div className="col-span-5 flex flex-col">
          <div className="flex-1 min-h-[500px]">
            <CodeWorkspace 
              selectedSpriteId={selectedSpriteId}
              sprites={sprites}
              onUpdateSprite={handleUpdateSprite}
            />
          </div>
        </div>
        
        {/* Right area with sprite preview and editor */}
        <div className="col-span-4 flex flex-col space-y-4">
          {/* Canvas for sprite preview */}
          <div className="h-[300px] bg-white rounded-lg shadow overflow-hidden">
            <Canvas 
              sprites={sprites} 
              spriteStates={spriteStates}
              onCollision={handleCollision}
              isPlaying={isPlaying}
            />
          </div>
          
          {/* Sprite editor */}
          <SpriteEditor 
            sprites={sprites}
            selectedSpriteId={selectedSpriteId}
            onSelectSprite={setSelectedSpriteId}
            onAddSprite={handleAddSprite}
            onUpdateSprite={handleUpdateSprite}
            onDeleteSprite={handleDeleteSprite}
          />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white p-4 shadow-inner">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>Sprite Swap Studio - A Scratch-like code editor with collision-based animation swapping</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
